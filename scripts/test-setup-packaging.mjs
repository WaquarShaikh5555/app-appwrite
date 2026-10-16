#!/usr/bin/env node
/**
 * Offline checks for the tar.gz packager and the function-deployment logic in
 * scripts/setup-appwrite.mjs.
 *
 *   node scripts/test-setup-packaging.mjs
 *
 * The packager produces the archive Appwrite builds the join service from, so a
 * bug here shows up as a function that will not build — after the person has
 * already handed over an API key and is waiting for a result. These checks run
 * without a network or an Appwrite project: they verify the archive against
 * `tar` itself, byte for byte.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectFiles, createTar, createTarGz, packageDirectory } from "./lib/targz.mjs";

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✖ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title) {
  console.log(`\n${title}`);
}

const workspace = mkdtempSync(join(tmpdir(), "eternalz-pack-"));
const source = join(workspace, "join-group");

try {
  section("Fixtures");
  mkdirSync(join(source, "src"), { recursive: true });
  mkdirSync(join(source, "node_modules", "left-pad"), { recursive: true });
  writeFileSync(join(source, "main.js"), "module.exports = async () => {};\n");
  writeFileSync(join(source, "package.json"), '{"name":"join-group"}\n');
  writeFileSync(join(source, "src", "helper.js"), "// nested file\n");
  writeFileSync(join(source, "node_modules", "left-pad", "index.js"), "// must not ship\n");
  writeFileSync(join(source, ".DS_Store"), "junk");
  console.log(`  source: ${source}`);

  section("collectFiles");
  const files = collectFiles(source);
  const paths = files.map((file) => file.path);
  check("finds top-level files", paths.includes("main.js") && paths.includes("package.json"));
  check("finds nested files with forward slashes", paths.includes("src/helper.js"), paths.join(", "));
  check("excludes node_modules", !paths.some((path) => path.includes("node_modules")));
  check("excludes .DS_Store", !paths.includes(".DS_Store"));
  check("is sorted", JSON.stringify(paths) === JSON.stringify([...paths].sort()));

  section("Archive structure");
  const { buffer } = packageDirectory(source);
  check("is gzip (magic 1f 8b)", buffer[0] === 0x1f && buffer[1] === 0x8b, `${buffer[0]} ${buffer[1]}`);
  check("is non-trivial in size", buffer.length > 200, `${buffer.length} bytes`);

  const archive = join(workspace, "code.tar.gz");
  writeFileSync(archive, buffer);

  const tarAvailable = (() => {
    try {
      execFileSync("tar", ["--version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  })();

  if (tarAvailable) {
    const listing = execFileSync("tar", ["-tzf", archive], { encoding: "utf8" })
      .trim()
      .split("\n")
      .map((line) => line.replace(/^\.\//, ""))
      .filter(Boolean)
      .sort();
    check(
      "tar reads the archive and lists exactly the expected files",
      JSON.stringify(listing) === JSON.stringify(["main.js", "package.json", "src/helper.js"]),
      listing.join(", "),
    );

    const extract = join(workspace, "extracted");
    mkdirSync(extract, { recursive: true });
    execFileSync("tar", ["-xzf", archive, "-C", extract]);

    const roundTrip = (relative) => {
      const original = readFileSync(join(source, relative));
      const restored = readFileSync(join(extract, relative));
      return original.equals(restored);
    };
    check("main.js survives byte for byte", roundTrip("main.js"));
    check("nested src/helper.js survives byte for byte", roundTrip("src/helper.js"));
    check("node_modules was not extracted", !existsSync(join(extract, "node_modules")));
  } else {
    console.log("  ! tar not available — skipping the independent read-back checks");
  }

  section("Determinism and validation");
  const first = createTarGz(collectFiles(source), { mtime: 1_700_000_000 });
  const second = createTarGz(collectFiles(source), { mtime: 1_700_000_000 });
  check("same input and mtime give identical bytes", first.equals(second));
  const differently = createTarGz(collectFiles(source), { mtime: 1_700_000_001 });
  check("a different mtime changes the bytes", !first.equals(differently));

  const raw = createTar(collectFiles(source), { mtime: 1_700_000_000 });
  check("tar length is a multiple of 512", raw.length % 512 === 0, `${raw.length}`);
  check("ends with two zero blocks", raw.subarray(-1024).every((byte) => byte === 0));
  check(
    "header carries the ustar magic",
    raw.subarray(257, 263).toString("ascii") === "ustar\0",
    JSON.stringify(raw.subarray(257, 263).toString("ascii")),
  );
  check(
    "the first entry is named main.js",
    raw.subarray(0, 7).toString("ascii") === "main.js",
    JSON.stringify(raw.subarray(0, 7).toString("ascii")),
  );
  // Mode is recorded per file, and the checksum field must not be left as spaces
  // or tar rejects the whole archive.
  const checksum = raw.subarray(148, 156).toString("ascii");
  check("checksum field is filled in", /^[0-7]{6}\0 /.test(checksum), JSON.stringify(checksum));

  let threwOnLongPath = false;
  try {
    createTar([{ path: "x".repeat(101), data: Buffer.from("hi") }]);
  } catch {
    threwOnLongPath = true;
  }
  check("an over-long path throws instead of corrupting the archive", threwOnLongPath);

  let threwOnEmpty = false;
  const empty = join(workspace, "empty");
  mkdirSync(empty);
  try {
    packageDirectory(empty);
  } catch {
    threwOnEmpty = true;
  }
  check("an empty directory throws instead of producing an empty deployment", threwOnEmpty);

  section("The real join-group function");
  const realDir = join(process.cwd(), "functions", "join-group");
  const real = packageDirectory(realDir);
  const realPaths = real.files.map((file) => file.path);
  check("packages main.js", realPaths.includes("main.js"));
  check("packages package.json", realPaths.includes("package.json"));
  check("leaves node_modules out", !realPaths.some((path) => path.includes("node_modules")));
  check(
    "the archive hash is stable for identical input",
    createHash("sha256").update(packageDirectory(realDir).buffer).digest("hex") ===
      createHash("sha256").update(real.buffer).digest("hex"),
  );
  console.log(`  → ${realPaths.join(", ")} (${real.buffer.length} bytes)`);
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
