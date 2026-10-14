/**
 * Document Manager ("Vault") configuration.
 *
 * These IDs must exist in the Appwrite project. `scripts/setup-appwrite.mjs`
 * creates all of them, and Settings → Document Manager → Setup check verifies
 * them from inside the app.
 */

export const VAULT = {
  /** Database that holds the vault tables. */
  databaseId: "eternalz",
  /** One row per group. */
  groupsTableId: "vault_groups",
  /** One row per stored file. */
  filesTableId: "vault_files",
  /** Storage bucket that holds the bytes. */
  bucketId: "vault-docs",
  /** Function that turns an invite code into team membership. */
  joinFunctionId: "join-group",
} as const;

/** Hard cap per file. Keep in sync with the bucket's maximumFileSize. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * Extensions the bucket accepts. Deliberately excludes executables, scripts,
 * installers and archives that commonly carry malware — a document manager has
 * no business accepting `.exe`, `.apk`, `.bat`, `.sh` or macro-heavy binaries.
 */
export const ALLOWED_EXTENSIONS = [
  // documents
  "pdf", "doc", "docx", "odt", "rtf", "txt", "md",
  // spreadsheets
  "xls", "xlsx", "ods", "csv", "tsv",
  // slides
  "ppt", "pptx", "odp",
  // images
  "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp",
] as const;

/** Mime types per extension, used when the picker gives us nothing useful. */
export const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  txt: "text/plain",
  md: "text/markdown",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odp: "application/vnd.oasis.opendocument.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
};
