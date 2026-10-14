#!/usr/bin/env node
/**
 * Verify that a built artifact is a real, installable APK.
 *
 * A Gradle build can "succeed" while producing something useless — an empty
 * archive, an unsigned package, or a bundle with no dex (so it installs and then
 * crashes immediately). This checks the things that actually decide whether the
 * file will install on a phone, and prints what it found.
 *
 * Usage:  node scripts/verify-apk.mjs path/to/app.apk
 */

import { readFileSync, statSync } from "node:fs";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/verify-apk.mjs <file.apk>");
  process.exit(2);
}

const problems = [];
const notes = [];

const check = (ok, okMessage, failMessage) => {
  if (ok) notes.push(okMessage);
  else problems.push(failMessage);
  return ok;
};

// ── basic file sanity ────────────────────────────────────────────────────────
const stats = (() => {
  try {
    return statSync(path);
  } catch {
    console.error(`✖ ${path} does not exist.`);
    process.exit(1);
  }
})();

const sizeMb = stats.size / (1024 * 1024);
check(
  stats.size > 1024 * 1024,
  `size ${sizeMb.toFixed(1)} MB`,
  `the file is only ${sizeMb.toFixed(2)} MB — almost certainly not a real APK`,
);

const head = readFileSync(path).subarray(0, 4);
check(
  head[0] === 0x50 && head[1] === 0x4b,
  "looks like a ZIP archive (PK header)",
  "the file is not a ZIP archive — Gradle did not produce an APK",
);

// ── read the central directory without external tools ────────────────────────
/**
 * Parse the ZIP end-of-central-directory record and walk the entries. Avoids
 * depending on `unzip` being installed on the runner, and avoids inflating a
 * 60 MB archive just to read its file names.
 */
function listZipEntries(filePath) {
  const buffer = readFileSync(filePath);

  // Find the EOCD signature, scanning back over the (up to 64 KB) comment.
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 66000); i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd === -1) throw new Error("no ZIP end-of-central-directory record");

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  const entries = [];
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    entries.push({
      name: buffer.toString("utf8", offset + 46, offset + 46 + nameLength),
      compressedSize,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { entries, complete: entries.length === count, declaredCount: count };
}

let zip;
try {
  zip = listZipEntries(path);
} catch (error) {
  console.error(`✖ Could not read the archive: ${error.message}`);
  process.exit(1);
}

check(
  zip.entries.length === zip.declaredCount,
  `${zip.entries.length} archive entries`,
  `archive is truncated — found ${zip.entries.length} of ${zip.declaredCount} entries`,
);

const names = zip.entries.map((entry) => entry.name);

// ── the three things that make an APK usable ─────────────────────────────────
check(
  names.includes("AndroidManifest.xml"),
  "AndroidManifest.xml present",
  "AndroidManifest.xml is missing — Android will refuse to install this",
);

const dexFiles = names.filter((name) => /^classes\d*\.dex$/.test(name));
check(
  dexFiles.length > 0,
  `${dexFiles.length} dex file${dexFiles.length === 1 ? "" : "s"} (${dexFiles.join(", ")})`,
  "no classes.dex — the app contains no code and would crash on launch",
);

const signature = names.find(
  (name) =>
    name.startsWith("META-INF/") && /\.(RSA|DSA|EC)$/i.test(name),
);
check(
  Boolean(signature),
  `signed (${signature ?? "checking"})`,
  "no signature found — Android rejects unsigned APKs",
);

// ── does it carry native code for the phone? ─────────────────────────────────
const abis = [...new Set(
  names
    .filter((name) => name.startsWith("lib/"))
    .map((name) => name.split("/")[1])
    .filter(Boolean),
)].sort();

check(
  abis.length > 0,
  `native libraries for: ${abis.join(", ")}`,
  "no native libraries — Reanimated and the Expo modules would fail at runtime",
);

// A modern phone is arm64; warn only if that is somehow absent from a build
// that does contain native code.
if (abis.length > 0 && !abis.includes("arm64-v8a")) {
  problems.push(
    `built ABIs (${abis.join(", ")}) omit arm64-v8a — this will not install on most current phones`,
  );
}

const dexIsEmpty = dexFiles.every((name) => {
  const entry = zip.entries.find((candidate) => candidate.name === name);
  return !entry || entry.compressedSize < 1024;
});
check(!dexIsEmpty, "dex payload is non-trivial", "dex entries are suspiciously small");

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\nAPK verification — ${path}\n`);
for (const note of notes) console.log(`  ✔ ${note}`);

if (problems.length > 0) {
  console.log();
  for (const problem of problems) console.log(`  ✖ ${problem}`);
  console.log("\nArtifact is NOT a usable APK.\n");
  process.exit(1);
}

console.log("\nArtifact is a valid, signed APK.\n");
