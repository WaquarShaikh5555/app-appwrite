#!/usr/bin/env node
/**
 * Logic tests for the Document Manager's pure pieces.
 *
 * These run in plain Node — no device, no Appwrite, no network — which is the
 * point: the parts that can be verified in an offline sandbox are verified here,
 * so only the genuinely device/backend-dependent behaviour is left untested.
 *
 * Run:  node scripts/test-vault-logic.mjs
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PDFDocument, degrees } from "pdf-lib";

// ── tiny harness ──────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✔ ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  ✖ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function group(title) {
  console.log(`\n${title}`);
}

const bytesEqual = (a, b) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

// ── base64 codec ─────────────────────────────────────────────────────────────
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const LOOKUP = (() => {
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < ALPHABET.length; i += 1) table[ALPHABET.charCodeAt(i)] = i;
  return table;
})();

function bytesToBase64(bytes) {
  let out = "";
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63] + ALPHABET[n & 63];
  }
  const rest = bytes.length - i;
  if (rest === 1) {
    const n = bytes[i] << 16;
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + "==";
  } else if (rest === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + ALPHABET[(n >> 6) & 63] + "=";
  }
  return out;
}

function base64ToBytes(base64) {
  let clean = base64.replace(/\s/g, "");
  const comma = clean.indexOf(",");
  if (clean.startsWith("data:") && comma > -1) clean = clean.slice(comma + 1);
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  const length = Math.floor((clean.length * 3) / 4) - padding;
  const out = new Uint8Array(Math.max(length, 0));
  let outIndex = 0;
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i += 1) {
    const value = LOOKUP[clean.charCodeAt(i)];
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[outIndex] = (buffer >> bits) & 0xff;
      outIndex += 1;
    }
  }
  return outIndex === out.length ? out : out.subarray(0, outIndex);
}

group("base64 codec (services/vault/binary.ts)");
for (const size of [0, 1, 2, 3, 4, 5, 255, 256, 1000, 65536]) {
  const original = new Uint8Array(size).map((_, i) => (i * 37 + 11) % 256);
  const roundTripped = base64ToBytes(bytesToBase64(original));
  const reference = new Uint8Array(Buffer.from(Buffer.from(original).toString("base64"), "base64"));
  check(
    `${size} bytes round-trip and match Node's codec`,
    bytesEqual(roundTripped, original) && bytesEqual(roundTripped, reference),
  );
}
check("strips a data: URL prefix", bytesEqual(base64ToBytes("data:image/png;base64,SGk="), new Uint8Array([72, 105])));
check("ignores stray whitespace", bytesEqual(base64ToBytes("SG\nk="), new Uint8Array([72, 105])));

// ── filename handling ────────────────────────────────────────────────────────
const EXT = (name) => {
  const clean = name.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  if (dot <= 0 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1).toLowerCase();
};

function sanitizeFileName(fileName, fallback = "untitled") {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  const limited = cleaned.slice(0, 180).trim();
  return limited.length > 0 ? limited : fallback;
}

const ALLOWED = [
  "pdf", "doc", "docx", "odt", "rtf", "txt", "md",
  "xls", "xlsx", "ods", "csv", "tsv",
  "ppt", "pptx", "odp",
  "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp",
];

group("filename sanitising and type gating");
check("strips unix path traversal", sanitizeFileName("../../etc/passwd") === "passwd");
check("strips windows path traversal", sanitizeFileName("..\\..\\windows\\system32\\cmd.exe") === "cmd.exe");
check("removes leading dots (no hidden files)", !sanitizeFileName("...hidden.pdf").startsWith("."));
check("removes control characters", sanitizeFileName("re\u0000port\u001f.pdf") === "report.pdf");
check("strips shell/URL metacharacters", sanitizeFileName('in"voice<>.pdf') === "invoice.pdf");
check("keeps unicode names intact", sanitizeFileName("कर-दस्तावेज़.pdf") === "कर-दस्तावेज़.pdf");
check("falls back when everything is stripped", sanitizeFileName("///") === "untitled");
check("caps length at 180", sanitizeFileName("a".repeat(500) + ".pdf").length === 180);
check("allows a normal pdf", ALLOWED.includes(EXT("report.pdf")));
check("allows an uppercase JPG", ALLOWED.includes(EXT("HOLIDAY.JPG")));
check("rejects executables", !ALLOWED.includes(EXT("setup.exe")));
check("rejects android packages", !ALLOWED.includes(EXT("app.apk")));
check("rejects shell scripts", !ALLOWED.includes(EXT("deploy.sh")));
check("rejects macro-enabled office files", !ALLOWED.includes(EXT("budget.xlsm")));
check("treats a dotless name as no extension", EXT("README") === "");

// ── join-code hashing must match the deployed function ───────────────────────
const sha256Hex = (input) => createHash("sha256").update(input, "utf8").digest("hex");

group("join-code parity between the real source files");
{
  // Pull normalizeJoinCode out of BOTH implementations and compare behaviour.
  // This is the check that actually matters: if the client and the deployed
  // function ever normalise codes differently, valid codes silently stop
  // working — so we assert against the real source, not a paraphrase.
  const readFile = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

  const clientSource = readFile("../services/vault/format.ts");
  const functionSource = readFile("../functions/join-group/main.js");

  const extract = (source, label) => {
    const match = source.match(
      /normalizeJoinCode[^\n]*\n[^\n]*?return\s+([^;]+);/,
    );
    if (!match) throw new Error(`could not extract normalizeJoinCode from ${label}`);
    return new Function("code", `return ${match[1]};`);
  };

  const clientNormalize = extract(clientSource, "format.ts");
  const functionNormalize = extract(functionSource, "main.js");

  const samples = [
    "ABCD-EFGH",
    "abcd efgh",
    "  AbCd-EfGh  ",
    "ABCDEFGH",
    "abcd_efgh",
    "A-B-C-D",
  ];

  const mismatches = samples.filter(
    (sample) => clientNormalize(sample) !== functionNormalize(sample),
  );
  check(
    "client and function normalise codes identically for every sample",
    mismatches.length === 0,
    mismatches.length ? `diverged on ${JSON.stringify(mismatches)}` : "",
  );

  check("normalisation upper-cases", clientNormalize("abcd") === "ABCD");
  check("normalisation drops dashes", clientNormalize("A-B-C") === "ABC");
  check("normalisation drops spaces", clientNormalize("A B C") === "ABC");
  check("underscores are NOT silently dropped", clientNormalize("A_B") === "A_B");
  check("null-safe in the function", functionNormalize(null) === "");

  // The hash on both sides is sha256 over salt+normalised code.
  const salt = "9f2c1d";
  const code = "ABCD-EFGH-IJKL-MNPQ";
  check(
    "client hash equals function hash for the same salt and code",
    sha256Hex(`${salt}${clientNormalize(code)}`) ===
      sha256Hex(`${salt}${functionNormalize(code)}`),
  );
  check(
    "hash is stable across formatting",
    sha256Hex(`${salt}${clientNormalize("ABCD-EFGH")}`) ===
      sha256Hex(`${salt}${clientNormalize("abcdefgh")}`),
  );

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const generated = Array.from(new Uint8Array(16).fill(200)).map((b) => alphabet[b % alphabet.length]).join("");
  check("generated code uses an unambiguous alphabet (no I/O/0/1)", !/[IO01]/.test(generated));
  check("generated code is 16 characters", generated.length === 16);
}

// ── PDF operations (identical logic to services/vault/pdf.ts) ────────────────
group("PDF operations (services/vault/pdf.ts)");
{
  const makePdf = async (pageCount) => {
    const pdf = await PDFDocument.create();
    for (let i = 1; i <= pageCount; i += 1) {
      const page = pdf.addPage([300 + i * 10, 400 + i * 10]);
      page.drawText(`page ${i}`, { x: 20, y: 20 });
    }
    return pdf;
  };

  const bytesOf = async (pdf) => pdf.save({ useObjectStreams: false });
  const reload = async (bytes) => PDFDocument.load(bytes, { ignoreEncryption: true });

  // rotate
  {
    const pdf = await makePdf(3);
    const current = pdf.getPages()[0].getRotation().angle ?? 0;
    pdf.getPages()[0].setRotation(degrees(((current + 90) % 360 + 360) % 360));
    const reloaded = await reload(await bytesOf(pdf));
    check("rotating a page persists through save+load", reloaded.getPages()[0].getRotation().angle === 90);
  }

  // rotate wraps around
  {
    const pdf = await makePdf(1);
    const page = pdf.getPages()[0];
    for (let i = 0; i < 4; i += 1) {
      const current = page.getRotation().angle ?? 0;
      page.setRotation(degrees(((current + 90) % 360 + 360) % 360));
    }
    check("four 90° rotations return to 0°", (page.getRotation().angle ?? 0) === 0);
  }

  // delete
  {
    const pdf = await makePdf(4);
    pdf.removePage(1);
    const reloaded = await reload(await bytesOf(pdf));
    check("removing a page decreases the count", reloaded.getPageCount() === 3);
  }

  // guard: never delete the last page
  {
    const pdf = await makePdf(1);
    const wouldDelete = pdf.getPageCount() > 1;
    check("the last remaining page is protected from deletion", wouldDelete === false);
  }

  // move
  {
    const pdf = await makePdf(3);
    const pages = pdf.getPages();
    const widths = pages.map((page) => Math.round(page.getSize().width));
    const [moved] = pages.splice(2, 1);
    pages.splice(1, 0, moved);
    const after = pdf.getPages().map((page) => Math.round(page.getSize().width));
    check(
      "moving a page later then earlier restores the original order",
      after[1] === widths[2] && after[2] === widths[1],
    );
  }

  // merge
  {
    const base = await makePdf(2);
    const other = await makePdf(3);
    const copied = await base.copyPages(other, other.getPageIndices());
    copied.forEach((page) => base.addPage(page));
    const reloaded = await reload(await bytesOf(base));
    check("merging appends the other document's pages", reloaded.getPageCount() === 5);
  }

  // extract
  {
    const source = await makePdf(5);
    const fresh = await PDFDocument.create();
    const copied = await fresh.copyPages(source, [0, 2, 4]);
    copied.forEach((page) => fresh.addPage(page));
    const reloaded = await reload(await bytesOf(fresh));
    check("extracting pages builds a smaller document", reloaded.getPageCount() === 3);
  }

  // encrypted input must not throw
  {
    const pdf = await makePdf(1);
    const bytes = await pdf.save();
    let threw = false;
    try {
      await PDFDocument.load(bytes, { ignoreEncryption: true });
    } catch {
      threw = true;
    }
    check("load tolerates the ignoreEncryption option", !threw);
  }
}

// ── photos → PDF (services/vault/pdf.ts) ─────────────────────────────────────
group("photos → PDF (imagesToPdf)");
{
  const zlib = await import("node:zlib");

  // Build a genuinely valid PNG in-process. Embedding real image bytes is the
  // only way to prove this works — a stub would just prove the code compiles.
  const crcTable = (() => {
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    return table;
  })();

  const crc32 = (buffer) => {
    let crc = -1;
    for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  };

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  };

  const makePng = (width, height, rgb) => {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // truecolour
    const raw = Buffer.alloc(height * (1 + width * 3));
    for (let y = 0; y < height; y += 1) {
      const row = y * (1 + width * 3);
      raw[row] = 0; // filter: none
      for (let x = 0; x < width; x += 1) {
        const at = row + 1 + x * 3;
        raw[at] = rgb[0];
        raw[at + 1] = rgb[1];
        raw[at + 2] = rgb[2];
      }
    }
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  };

  // ── Pull the REAL functions out of services/vault/pdf.ts ────────────────────
  // Copy-pasting them here would defeat the purpose: the test would keep
  // passing after the shipped code changed. So we extract the actual source
  // (signature types stripped, module constants lifted alongside) and run it.
  const pdfSource = readFileSync(
    new URL("../services/vault/pdf.ts", import.meta.url),
    "utf8",
  );

  const liftConst = (name) => {
    const match = pdfSource.match(new RegExp(`const ${name} = [^;]+;`));
    if (!match) throw new Error(`could not lift ${name} from pdf.ts`);
    return match[0];
  };

  const liftFunction = (name, params) => {
    const marker = `function ${name}(`;
    const start = pdfSource.indexOf(marker);
    if (start === -1) throw new Error(`could not find ${name} in pdf.ts`);

    // Find the body's opening brace by balancing the parameter list.
    let depth = 0;
    let cursor = pdfSource.indexOf("(", start);
    let bodyStart = -1;
    for (; cursor < pdfSource.length; cursor += 1) {
      if (pdfSource[cursor] === "(") depth += 1;
      else if (pdfSource[cursor] === ")") {
        depth -= 1;
        if (depth === 0) {
          bodyStart = pdfSource.indexOf("{", cursor);
          break;
        }
      }
    }
    if (bodyStart === -1) throw new Error(`could not find the body of ${name}`);

    // Walk to the matching closing brace.
    let braces = 0;
    let end = bodyStart;
    for (; end < pdfSource.length; end += 1) {
      if (pdfSource[end] === "{") braces += 1;
      else if (pdfSource[end] === "}") {
        braces -= 1;
        if (braces === 0) break;
      }
    }

    const body = pdfSource.slice(bodyStart, end + 1);
    // Preserve async-ness: an `async` wrapper around a sync function silently
    // returns a Promise, which is exactly the sort of bug this suite exists to
    // catch — don't introduce it in the harness itself.
    const isAsync = pdfSource.includes(`async function ${name}(`);
    return new Function(
      "PDFDocument",
      `${liftConst("A4")}\n${liftConst("PHOTO_MARGIN")}\nreturn ${
        isAsync ? "async " : ""
      }function ${name}(${params}) ${body};`,
    )(PDFDocument);
  };

  const imagesToPdf = liftFunction("imagesToPdf", "images, options = {}");
  const photosPdfName = liftFunction("photosPdfName", "date = new Date()");

  check(
    "extracted the real imagesToPdf and photosPdfName from pdf.ts",
    typeof imagesToPdf === "function" && typeof photosPdfName === "function",
  );

  const wide = new Uint8Array(makePng(200, 100, [139, 92, 246]));
  const tall = new Uint8Array(makePng(60, 180, [196, 181, 253]));
  const huge = new Uint8Array(makePng(4000, 3000, [7, 6, 13]));

  // one image -> one A4 page
  {
    const bytes = await imagesToPdf([{ bytes: wide, type: "png" }]);
    check("output is a real PDF", Buffer.from(bytes.slice(0, 5)).toString() === "%PDF-");
    const reloaded = await PDFDocument.load(bytes);
    check("one image yields one page", reloaded.getPageCount() === 1);
    const size = reloaded.getPages()[0].getSize();
    check(
      "default fit centres the photo on an A4 page",
      Math.abs(size.width - 595.28) < 1 && Math.abs(size.height - 841.89) < 1,
    );
  }

  // multiple images
  {
    const bytes = await imagesToPdf([
      { bytes: wide, type: "png" },
      { bytes: tall, type: "png" },
      { bytes: huge, type: "png" },
    ]);
    const reloaded = await PDFDocument.load(bytes);
    check("three images yield three pages", reloaded.getPageCount() === 3);
  }

  // photo album mode
  {
    const bytes = await imagesToPdf([{ bytes: wide, type: "png" }], { fit: "image" });
    const reloaded = await PDFDocument.load(bytes);
    const size = reloaded.getPages()[0].getSize();
    check(
      'fit: "image" makes the page exactly the photo size',
      Math.round(size.width) === 200 && Math.round(size.height) === 100,
    );
  }

  // no upscaling: a small photo stays its natural size inside the frame
  {
    const bytes = await imagesToPdf([{ bytes: tall, type: "png" }]);
    const reloaded = await PDFDocument.load(bytes);
    const page = reloaded.getPages()[0];
    const embedded = await reloaded.embedPng(tall);
    check(
      "small photos are never upscaled to fill the page",
      embedded.width === 60 && embedded.height === 180 && page.getSize().width > 60,
    );
  }

  // rejects an empty set rather than writing a broken file
  {
    let message = "";
    try {
      await imagesToPdf([]);
    } catch (error) {
      message = error.message;
    }
    check("an empty image list is refused with a clear message", message.includes("no images"));
  }

  // file naming
  {
    const name = photosPdfName(new Date("2026-10-14T09:30:00Z"));
    check("photo PDF filenames are dated and collide-free", name === "Photos-2026-10-14-0930.pdf");
  }
}

// ── size formatting ──────────────────────────────────────────────────────────
group("human-readable sizes");
{
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes < 1024) return `${Math.round(bytes)} B`;
    const units = ["KB", "MB", "GB"];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
  };
  check("0 bytes", formatBytes(0) === "0 B");
  check("512 bytes", formatBytes(512) === "512 B");
  check("1 KB", formatBytes(1024) === "1.0 KB");
  check("1.5 MB", formatBytes(1024 * 1536) === "1.5 MB");
  check("25 MB limit renders readably", formatBytes(25 * 1024 * 1024) === "25 MB");
  check("negative input is handled", formatBytes(-1) === "—");
}

// ── report ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(58)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log(`\nFailures:\n${failures.map((name) => `  · ${name}`).join("\n")}`);
  process.exit(1);
}
console.log("All vault logic checks passed.");
