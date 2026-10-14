#!/usr/bin/env node
/**
 * Create everything the Document Manager needs in an Appwrite project.
 *
 * Usage (from the repo root):
 *
 *   node scripts/setup-appwrite.mjs
 *
 * It asks for the API key if one isn't already in the environment, which is the
 * same command on macOS, Linux and Windows. (Prefer the environment? Set
 * APPWRITE_API_KEY and it is used as-is — that is the form to use in CI.)
 *
 * Optional overrides:
 *   APPWRITE_ENDPOINT     default https://tor.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID   default 6acf0e9b0034e6ac2483
 *   APPWRITE_API_KEY      skips the prompt
 *
 * Idempotent: run it as often as you like; existing resources are left alone.
 *
 * The key is never written to disk and is not echoed while you type it.
 */


const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? "https://tor.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "6acf0e9b0034e6ac2483";

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

/**
 * Ask for the key without echoing it.
 *
 * `APPWRITE_API_KEY=… node script` is bash syntax; it fails in PowerShell and
 * goes into shell history where a key does not belong. Prompting keeps the same
 * one command working everywhere, and the key never touches disk or history.
 */
async function promptForKey() {
  if (!process.stdin.isTTY) {
    console.error(
      "\n✖ APPWRITE_API_KEY is not set and there is no terminal to ask in.\n\n" +
        "  Create a key in the Appwrite console (Project → Overview → API keys)\n" +
        "  with the Databases, Tables, Buckets and Functions scopes, then either\n" +
        "  set APPWRITE_API_KEY in the environment or run this script from a\n" +
        "  terminal and it will ask for it.\n",
    );
    process.exit(1);
  }

  console.log(
    "\nEternalz · Document Manager setup\n\n" +
      "  Paste an Appwrite API key with the Databases, Tables, Buckets and\n" +
      "  Functions scopes (console → Overview → Integrations → API keys).\n" +
      "  It is not saved anywhere.\n",
  );

  return new Promise((resolve) => {
    const input = process.stdin;
    const wasRaw = input.isRaw;

    const finish = (value) => {
      if (input.isRaw) input.setRawMode(wasRaw ?? false);
      input.pause();
      process.stdout.write("\n");
      const key = value.trim().replace(/^["']|["']$/g, "");
      if (!key) {
        console.error("✖ No key entered. Nothing was changed.\n");
        process.exit(1);
      }
      resolve(key);
    };

    process.stdout.write("  API key: ");
    input.resume();
    input.setEncoding("utf8");

    // Read keystrokes ourselves so the key is never echoed to the screen.
    if (typeof input.setRawMode === "function") input.setRawMode(true);

    let buffer = "";
    const onData = (chunk) => {
      for (const char of String(chunk)) {
        if (char === "\r" || char === "\n") {
          input.removeListener("data", onData);
          finish(buffer);
          return;
        }
        if (char === "\u0003") {
          // Ctrl-C
          input.removeListener("data", onData);
          if (input.isRaw) input.setRawMode(wasRaw ?? false);
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          buffer = buffer.slice(0, -1);
          continue;
        }
        if (char === "\u001b") continue; // ignore escape sequences
        buffer += char;
      }
    };
    input.on("data", onData);
  });
}

/**
 * Load the Appwrite server SDK.
 *
 * Imported dynamically so this runs before anything else: if dependencies are
 * missing, a static import would crash with a raw ERR_MODULE_NOT_FOUND stack
 * trace and tell a newcomer nothing, and asking for an API key first would waste
 * their time on a step that cannot work yet. This way the first thing they read
 * is the one command that fixes it.
 */
async function loadSdk() {
  try {
    return await import("node-appwrite");
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" || /Cannot find package/.test(error?.message ?? "")) {
      console.error(
        "\n✖ Dependencies aren't installed yet.\n\n" +
          "  From the project folder (where package.json lives), run:\n\n" +
          "    pnpm install\n\n" +
          "  then run this script again.\n",
      );
      process.exit(1);
    }
    throw error;
  }
}

const {
  Client,
  Compression,
  Databases,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
  TablesDBIndexType,
} = await loadSdk();

const API_KEY = (process.env.APPWRITE_API_KEY ?? "").trim() || (await promptForKey());

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
