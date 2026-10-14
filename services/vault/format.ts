import { ALLOWED_EXTENSIONS, MIME_BY_EXTENSION } from "@/constants/vault";
import type { VaultFileKind } from "@/types/vault";

/**
 * Pure helpers for the Document Manager. No Appwrite, no React Native imports —
 * so they can be unit-tested in plain Node (see scripts/test-vault-logic.mjs).
 */

/** Extension of a filename, lowercased, without the dot. "" when there is none. */
export function extensionOf(fileName: string): string {
  const clean = fileName.split(/[?#]/)[0];
  const dot = clean.lastIndexOf(".");
  if (dot <= 0 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1).toLowerCase();
}

/**
 * Strip anything that could be used to escape a directory or spoof a name:
 * path separators, control characters, and leading dots. Keeps unicode letters
 * (people name files in their own language).
 */
export function sanitizeFileName(fileName: string, fallback = "untitled"): string {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    // control chars + the characters Windows/Unix treat specially
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "");
  const limited = cleaned.slice(0, 180).trim();
  return limited.length > 0 ? limited : fallback;
}

export function isAllowedFileName(fileName: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(fileName));
}

/** Best-effort mime type from the file name (used when the picker is silent). */
export function mimeTypeFor(fileName: string, reported?: string): string {
  if (reported && reported !== "application/octet-stream") return reported;
  return MIME_BY_EXTENSION[extensionOf(fileName)] ?? "application/octet-stream";
}

export function kindOf(mimeType: string, fileName: string): VaultFileKind {
  const ext = extensionOf(fileName);
  const mime = mimeType.toLowerCase();

  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    ["xls", "xlsx", "ods", "csv", "tsv"].includes(ext)
  ) {
    return "sheet";
  }
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    ["ppt", "pptx", "odp"].includes(ext)
  ) {
    return "slides";
  }
  if (
    mime.startsWith("text/") ||
    mime.includes("word") ||
    mime.includes("opendocument.text") ||
    mime.includes("rtf") ||
    ["doc", "docx", "odt", "rtf", "txt", "md"].includes(ext)
  ) {
    return "document";
  }
  return "other";
}

/** Human readable size, e.g. 1.4 MB. */
export function formatBytes(bytes: number): string {
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
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * The verification hash for an invite code: sha256(salt + code).
 * The join function computes this identically on the server (see
 * functions/join-group/main.js) — the two implementations must stay in step.
 */
export function joinCodePayload(salt: string, code: string): string {
  return `${salt}${normalizeJoinCode(code)}`;
}

/** Codes are compared case-insensitively and ignoring spaces/dashes people add. */
export function normalizeJoinCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

/** Groups codes into readable 4-character blocks: ABCD-EFGH-IJKL-MNPQ */
export function formatJoinCode(code: string): string {
  return (normalizeJoinCode(code).match(/.{1,4}/g) ?? []).join("-");
}

/** Random invite code from a byte source. 16 chars of base32 ≈ 80 bits. */
export function joinCodeFromBytes(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1 — no misreads
  let out = "";
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

/** Salt shown to the user as a compact string. */
export function saltFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** sha256 of the raw code, used only for indexed lookup in the join function. */
export function lookupPayload(code: string): string {
  return normalizeJoinCode(code);
}

/** Byte size guard shared by the UI and the service layer. */
export function exceedsLimit(bytes: number, limit: number): boolean {
  return bytes > limit;
}
