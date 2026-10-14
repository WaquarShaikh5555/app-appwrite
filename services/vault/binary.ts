/**
 * Base64 ↔ bytes helpers written by hand rather than via `atob`/`btoa`:
 * those globals are missing on some React Native runtimes and behave
 * differently per platform. This is dependency-free and works on web, Hermes
 * and Node — which also makes it directly testable (scripts/test-vault-logic.mjs).
 */

const ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const LOOKUP = (() => {
  const table = new Int16Array(256).fill(-1);
  for (let i = 0; i < ALPHABET.length; i += 1) table[ALPHABET.charCodeAt(i)] = i;
  return table;
})();

export function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  // Process in chunks so we never build an enormous intermediate array.
  const CHUNK = 0x8000;
  for (let start = 0; start < bytes.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, bytes.length);
    let chunk = "";
    let i = start;
    for (; i + 2 < end; i += 3) {
      const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      chunk +=
        ALPHABET[(n >> 18) & 63] +
        ALPHABET[(n >> 12) & 63] +
        ALPHABET[(n >> 6) & 63] +
        ALPHABET[n & 63];
    }
    // tail
    const remaining = end - i;
    if (remaining === 1) {
      const n = bytes[i] << 16;
      chunk += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63] + "==";
    } else if (remaining === 2) {
      const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
      chunk +=
        ALPHABET[(n >> 18) & 63] +
        ALPHABET[(n >> 12) & 63] +
        ALPHABET[(n >> 6) & 63] +
        "=";
    }
    out += chunk;
  }
  return out;
}

export function base64ToBytes(base64: string): Uint8Array {
  let clean = base64.replace(/\s/g, "");
  // Tolerate data: URLs, which is what browser/file APIs hand back.
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
    if (value < 0) continue; // skip padding and any stray character
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

/** UTF-8 string → bytes (no TextEncoder dependency). */
export function utf8ToBytes(text: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff) {
      // surrogate pair
      const next = text.charCodeAt(i + 1);
      code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
      i += 1;
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    } else {
      out.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }
  return new Uint8Array(out);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const byte = bytes[i];
    if (byte < 0x80) {
      out += String.fromCharCode(byte);
      i += 1;
    } else if (byte < 0xe0) {
      out += String.fromCharCode(((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (byte < 0xf0) {
      out += String.fromCharCode(
        ((byte & 0x0f) << 12) |
          ((bytes[i + 1] & 0x3f) << 6) |
          (bytes[i + 2] & 0x3f),
      );
      i += 3;
    } else {
      const code =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f);
      const offset = code - 0x10000;
      out += String.fromCharCode(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff));
      i += 4;
    }
  }
  return out;
}
