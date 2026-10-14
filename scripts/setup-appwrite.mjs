#!/usr/bin/env node
/**
 * Create everything the Document Manager needs in an Appwrite project.
 *
 * Usage (from the repo root):
 *
 *   APPWRITE_API_KEY=your-key node scripts/setup-appwrite.mjs
 *
 * Optional overrides:
 *   APPWRITE_ENDPOINT     default https://tor.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID   default 6acf0e9b0034e6ac2483
 *
 * Idempotent: run it as often as you like; existing resources are left alone.
 *
 * The API key is read from the environment and never written to disk. Use a key
 * scoped to what this touches (databases, tables, buckets) and delete it
 * afterwards if you don't plan to re-run the script.
 */

import {
  Client,
  Compression,
  Databases,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
  TablesDBIndexType,
} from "node-appwrite";

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? "https://tor.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "6acf0e9b0034e6ac2483";
const API_KEY = process.env.APPWRITE_API_KEY;

const DATABASE_ID = "eternalz";
const GROUPS_TABLE_ID = "vault_groups";
const FILES_TABLE_ID = "vault_files";
const BUCKET_ID = "vault-docs";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "odt", "rtf", "txt", "md",
  "xls", "xlsx", "ods", "csv", "tsv",
  "ppt", "pptx", "odp",
  "jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "bmp",
];

if (!API_KEY) {
  console.error(
    "\n✖ APPWRITE_API_KEY is not set.\n\n" +
      "  Create one in the Appwrite console (Project → Overview → API keys) with\n" +
      "  the Databases, Tables, Buckets and Teams scopes, then run:\n\n" +
      "    APPWRITE_API_KEY=your-key node scripts/setup-appwrite.mjs\n",
  );
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);
const tables = new TablesDB(client);
const storage = new Storage(client);

const log = (icon, message) => console.log(`${icon} ${message}`);

async function exists(check) {
  try {
    await check();
    return true;
  } catch (error) {
    if (error?.code === 404) return false;
    throw error;
  }
}

/** Create something, tolerating "it's already there" and optional features. */
async function ensure(label, create, { optional = false } = {}) {
  try {
    await create();
    log("✔", `created ${label}`);
    return true;
  } catch (error) {
    if (error?.code === 409) {
      log("•", `${label} already exists`);
      return true;
    }
    if (optional) {
      log("!", `${label} skipped — ${error.message}`);
      return false;
    }
    throw error;
  }
}

async function ensureDatabase() {
  if (await exists(() => databases.get({ databaseId: DATABASE_ID }))) {
    log("•", `database ${DATABASE_ID} already exists`);
    return;
  }
  await databases.create({ databaseId: DATABASE_ID, name: "Eternalz" });
  log("✔", `created database ${DATABASE_ID}`);
}

/**
 * Bucket permissions are intentionally minimal.
 *
 * With `fileSecurity: true`, Appwrite enforces each file's own permissions, so
 * reads are governed per file — every upload in the app grants access to its
 * group's team and nobody else. The bucket only needs to let signed-in users
 * upload; it never grants blanket read access.
 */
async function ensureBucket() {
  if (await exists(() => storage.getBucket({ bucketId: BUCKET_ID }))) {
    log("•", `bucket ${BUCKET_ID} already exists`);
    return;
  }

  const base = {
    bucketId: BUCKET_ID,
    name: "Eternalz documents",
    permissions: [Permission.create(Role.users())],
    fileSecurity: true, // per-file permissions decide who can read what
    maximumFileSize: MAX_FILE_BYTES,
    allowedFileExtensions: ALLOWED_EXTENSIONS,
    compression: Compression.None,
    transformations: true, // needed for server-side image thumbnails
  };

  // Antivirus and encryption are the safety nets worth having; not every
  // self-hosted build supports them, so fall back rather than fail.
  const withSafety = { ...base, encryption: true, antivirus: true };
  if (await ensureFreshBucket(withSafety)) return;

  log("!", "retrying without antivirus/encryption (unsupported on this server)");
  await ensureFreshBucket(base);
}

async function ensureFreshBucket(params) {
  try {
    await storage.createBucket(params);
    log("✔", `created bucket ${BUCKET_ID}${params.antivirus ? " (antivirus + encryption on)" : ""}`);
    return true;
  } catch (error) {
    if (error?.code === 409) {
      log("•", `bucket ${BUCKET_ID} already exists`);
      return true;
    }
    return false;
  }
}

async function ensureTable(tableId, name, columns, indexes) {
  const present = await exists(() => tables.getTable({ databaseId: DATABASE_ID, tableId }));
  if (present) {
    log("•", `table ${tableId} already exists`);
    return;
  }

  await tables.createTable({
    databaseId: DATABASE_ID,
    tableId,
    name,
    // Row security is what makes per-row team permissions meaningful.
    rowSecurity: true,
    permissions: [Permission.create(Role.users())],
  });
  log("✔", `created table ${tableId} (row security on)`);

  for (const column of columns) {
    await ensure(`${tableId}.${column.key}`, () => {
      if (column.type === "integer") {
        return tables.createIntegerColumn({
          databaseId: DATABASE_ID,
          tableId,
          key: column.key,
          required: column.required ?? true,
        });
      }
      return tables.createStringColumn({
        databaseId: DATABASE_ID,
        tableId,
        key: column.key,
        size: column.size ?? 255,
        required: column.required ?? true,
      });
    });
  }

  for (const index of indexes) {
    await ensure(`${tableId} index ${index.key}`, () =>
      tables.createIndex({
        databaseId: DATABASE_ID,
        tableId,
        key: index.key,
        type: TablesDBIndexType.Key,
        columns: index.columns,
      }),
    );
  }
}

async function main() {
  console.log(`\nEternalz · Document Manager setup\n   endpoint ${ENDPOINT}\n   project  ${PROJECT_ID}\n`);

  await ensureDatabase();
  await ensureBucket();

  await ensureTable(
    GROUPS_TABLE_ID,
    "Vault groups",
    [
      { key: "name", size: 64 },
      { key: "description", size: 256, required: false },
      { key: "teamId", size: 36 },
      { key: "ownerId", size: 36 },
      { key: "joinCodeSalt", size: 64 },
      { key: "joinCodeHash", size: 64 },
      { key: "joinCodeLookup", size: 64 },
    ],
    [{ key: "join_lookup", columns: ["joinCodeLookup"] }],
  );

  await ensureTable(
    FILES_TABLE_ID,
    "Vault files",
    [
      { key: "groupId", size: 36 },
      { key: "name", size: 255 },
      { key: "bucketFileId", size: 36 },
      { key: "size", type: "integer" },
      { key: "mimeType", size: 128 },
      { key: "kind", size: 16 },
      { key: "uploadedBy", size: 36 },
      { key: "uploadedByName", size: 64 },
    ],
    [
      { key: "group_id", columns: ["groupId"] },
      { key: "bucket_file_id", columns: ["bucketFileId"] },
    ],
  );

  console.log(`
Done. Next:

  1. Deploy the join service (needed for invite codes):

       cd functions/join-group && npm install
       appwrite push function

  2. Give the function its API key in the Appwrite console:
       Functions → join-group → Settings → Environment variables
         APPWRITE_FUNCTION_API_KEY = <a key with teams.read, teams.write, rows.read>

  3. Open the app → Tools → Document Manager → Setup check.
`);
}

main().catch((error) => {
  console.error(`\n✖ Setup failed: ${error?.message ?? error}\n`);
  if (error?.code === 401) {
    console.error("  The API key was rejected — check its scopes and that it belongs to this project.\n");
  }
  process.exit(1);
});
