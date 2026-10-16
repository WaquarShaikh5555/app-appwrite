/**
 * A minimal tar.gz writer, used to package a function directory for Appwrite.
 *
 * Why not shell out to `tar`? `tar --exclude code.tar.gz -czf code.tar.gz .`
 * works on macOS and Linux, but the setup script is meant to be runnable
 * anywhere — including Windows, where that command does not exist in the same
 * form. Node already has gzip, and a tar header is 512 bytes with octal fields,
 * so writing the archive here removes a platform requirement from the one
 * command a person runs to get this project working.
 *
 * Only regular files are supported, which is all a function deployment needs:
 * extraction creates directories from the file paths.
 *
 * Deliberate limitations, so a surprise is a clear error rather than a corrupt
 * archive: paths longer than the 100-byte header field are rejected (nothing in
 * this project comes close), and neither symlinks nor hard links are followed.
 */

import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const BLOCK_SIZE = 512;
const MTIME_PLACEHOLDER = 0;

/** Never ship these: dependencies are installed by the build command instead. */
const ALWAYS_IGNORED = new Set(["node_modules", ".git", ".DS_Store", "code.tar.gz"]);

/**
 * List every file under `dir`, depth-first, sorted so archives are reproducible.
 * `ignore` is matched against the entry name at any level, which is how
 * node_modules is skipped no matter where it sits.
 */
export function collectFiles(dir, { ignore = ALWAYS_IGNORED } = {}) {
  const files = [];

  const walk = (current) => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name),
    );

    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const absolute = join(current, entry.name);

      if (entry.isDirectory()) {
        walk(absolute);
      } else if (entry.isFile()) {
        files.push({
          path: relative(dir, absolute).split(sep).join("/"),
          mode: statSync(absolute).mode & 0o777,
          data: readFileSync(absolute),
        });
      }
    }
  };

  walk(dir);
  return files;
}

/** Octal, NUL-terminated — the numeric format tar headers use. */
function octal(value, width) {
  return value.toString(8).padStart(width - 1, "0") + "\0";
}

/** One 512-byte ustar header for a regular file. */
export function tarHeader({ path, size, mode = 0o644, mtime = MTIME_PLACEHOLDER }) {
  if (Buffer.byteLength(path, "utf8") > 100) {
    throw new Error(`Path too long for the tar header (100 bytes max): ${path}`);
  }

  const header = Buffer.alloc(BLOCK_SIZE);
  header.write(path, 0, 100, "utf8");
  header.write(octal(mode, 8), 100, 8, "ascii"); // mode
  header.write(octal(0, 8), 108, 8, "ascii"); // uid
  header.write(octal(0, 8), 116, 8, "ascii"); // gid
  header.write(octal(size, 12), 124, 12, "ascii"); // size
  header.write(octal(mtime, 12), 136, 12, "ascii"); // mtime
  header.write("        ", 148, 8, "ascii"); // checksum: spaces while summing
  header.write("0", 156, 1, "ascii"); // typeflag: 0 = regular file
  header.write("ustar\0", 257, 6, "ascii"); // magic
  header.write("00", 263, 2, "ascii"); // version

  // The checksum is the sum of every header byte with the checksum field read
  // as spaces, written as six octal digits followed by NUL and space.
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(sum.toString(8).padStart(6, "0") + "\0 ", 148, 8, "ascii");

  return header;
}

/** Build an uncompressed tar archive from `{ path, data, mode, mtime }` entries. */
export function createTar(files, { mtime = MTIME_PLACEHOLDER } = {}) {
  const chunks = [];

  for (const file of files) {
    const data = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data);
    chunks.push(tarHeader({ path: file.path, size: data.length, mode: file.mode, mtime: file.mtime ?? mtime }));
    chunks.push(data);

    const padding = data.length % BLOCK_SIZE;
    if (padding !== 0) chunks.push(Buffer.alloc(BLOCK_SIZE - padding));
  }

  // Two zero blocks mark the end of an archive.
  chunks.push(Buffer.alloc(BLOCK_SIZE * 2));
  return Buffer.concat(chunks);
}

/** Gzip a tar archive. Level 9: these deployments are a few kilobytes. */
export function createTarGz(files, options = {}) {
  return gzipSync(createTar(files, options), { level: 9 });
}

/** Collect a directory and package it in one step. */
export function packageDirectory(dir, options = {}) {
  const files = collectFiles(dir, options);
  if (files.length === 0) throw new Error(`Nothing to package: ${dir} is empty`);
  return { buffer: createTarGz(files, options), files };
}
