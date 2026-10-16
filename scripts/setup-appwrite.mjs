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
 * It creates, in one pass:
 *
 *   database  eternalz
 *   bucket    vault-docs            (25 MB per file, 23 file types, antivirus)
 *   tables    vault_groups, vault_files  (with their columns and indexes)
 *   function  join-group            (deployed and activated, with its scopes)
 *
 * Optional flags:
 *   --redeploy      ship functions/join-group again even if a deployment is live
 *   --skip-deploy   set up everything except the function's code
 *
 * Optional overrides:
 *   APPWRITE_ENDPOINT     default https://tor.cloud.appwrite.io/v1
 *   APPWRITE_PROJECT_ID   default 6acf0e9b0034e6ac2483
 *   APPWRITE_API_KEY      skips the prompt
 *
 * Idempotent: run it as often as you like. Existing resources are left alone,
 * except the function's settings, which are brought back in line with this file
 * when they have drifted.
 *
 * The API key needs read and write on Databases, Tables, Buckets and Functions.
 * It is never written to disk and is not echoed while you type it.
 */


import { fileURLToPath } from "node:url";

import { packageDirectory } from "./lib/targz.mjs";

const ENDPOINT = process.env.APPWRITE_ENDPOINT ?? "https://tor.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? "6acf0e9b0034e6ac2483";

const DATABASE_ID = "eternalz";
const GROUPS_TABLE_ID = "vault_groups";
const FILES_TABLE_ID = "vault_files";
const BUCKET_ID = "vault-docs";
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/**
 * The join service.
 *
 * Creating a group is a client-side act; joining one is not. `join-group` is the
 * only thing in this project that turns an invite code into team membership: it
 * checks the code against the salted hash in `vault_groups` and adds the caller
 * to that group's team. Doing that in the app would mean trusting the app, and
 * any signed-in user could add themselves to any team — so the service has to be
 * deployed for invite codes to work at all.
 *
 * The scopes below are what the deployment may do at runtime. They are set on the
 * function itself, which is also why nothing has to be pasted into its
 * environment by hand: Appwrite injects APPWRITE_FUNCTION_API_KEY for a function
 * that has scopes, and the code reads that variable.
 */
const FUNCTION_ID = "join-group";
const FUNCTION_NAME = "join-group";
const FUNCTION_ENTRYPOINT = "main.js";
const FUNCTION_BUILD_COMMANDS = "npm install";
const FUNCTION_TIMEOUT_SECONDS = 15;
const FUNCTION_SCOPES = ["teams.read", "teams.write", "rows.read"];
const FUNCTION_DIR = fileURLToPath(new URL("../functions/join-group", import.meta.url));

/** Runtimes to try, newest first, if the server will not tell us what it offers. */
const FALLBACK_RUNTIMES = ["node-22", "node-20.0", "node-18.0"];

const ARGS = new Set(process.argv.slice(2));

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
  Functions,
  Permission,
  Query,
  Role,
  Storage,
  TablesDB,
  TablesDBIndexType,
} = await loadSdk();

// InputFile is not re-exported from the package root, and uploading a deployment
// needs it: the API takes a file part, not a path.
const { InputFile } = await import("node-appwrite/file");

const API_KEY = (process.env.APPWRITE_API_KEY ?? "").trim() || (await promptForKey());

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);
const tables = new TablesDB(client);
const storage = new Storage(client);
const functions = new Functions(client);

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

/* ── The join service ────────────────────────────────────────────────────── */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The newest Node runtime the server actually offers.
 *
 * Runtimes come and go — old ones get removed once upstream Node versions reach
 * end of life — so asking the server beats hardcoding a version that may have
 * been retired since this file was written. The list is also used to decide
 * whether an existing function's runtime is still valid.
 */
async function pickRuntime() {
  try {
    const { runtimes } = await functions.listRuntimes();
    const node = (runtimes ?? [])
      .map((runtime) => String(runtime.key ?? ""))
      .filter((key) => key.startsWith("node-"))
      .map((key) => ({ key, major: Number.parseInt(key.replace(/^node-/, ""), 10) || 0 }))
      .sort((a, b) => b.major - a.major);

    if (node.length > 0) {
      return { runtime: node[0].key, candidates: [...new Set([...node.map((r) => r.key), ...FALLBACK_RUNTIMES])] };
    }
  } catch (error) {
    log("!", `could not list runtimes (${error.message}) — using a known-good one`);
  }
  return { runtime: FALLBACK_RUNTIMES[0], candidates: FALLBACK_RUNTIMES };
}

/** True when the server rejected the request because of the scopes field. */
function isScopeProblem(error) {
  return /scope/i.test(error?.message ?? "");
}

/** Create the function, stepping down the runtime list if the server rejects one. */
async function createFunction(candidates, scopes) {
  let lastError;

  for (const runtime of candidates) {
    try {
      const created = await functions.create({
        functionId: FUNCTION_ID,
        name: FUNCTION_NAME,
        runtime,
        // Any signed-in user may call it; what they may do is decided by the code.
        execute: ["users"],
        events: [],
        schedule: "",
        timeout: FUNCTION_TIMEOUT_SECONDS,
        enabled: true,
        logging: true,
        entrypoint: FUNCTION_ENTRYPOINT,
        commands: FUNCTION_BUILD_COMMANDS,
        ...(scopes ? { scopes } : {}),
      });
      return { created, runtime };
    } catch (error) {
      lastError = error;
      if (error?.code === 409) throw error; // appeared between the get and the create
      // Anything that is not about the runtime (a bad key, a missing project)
      // would fail identically for every candidate, so report it now.
      if (!/runtime/i.test(error?.message ?? "")) throw error;
      log("!", `the server rejected runtime ${runtime} — trying the next one`);
    }
  }

  throw lastError;
}

/** Make sure the join service exists and is configured the way this repo needs. */
async function ensureFunction() {
  const { runtime, candidates } = await pickRuntime();

  let existing = null;
  try {
    existing = await functions.get(FUNCTION_ID);
  } catch (error) {
    if (error?.code !== 404) throw error;
  }

  if (!existing) {
    let result;
    try {
      result = await createFunction(candidates, FUNCTION_SCOPES);
    } catch (error) {
      if (!isScopeProblem(error)) throw error;
      log("!", `this server would not accept the function's scopes (${error.message})`);
      log("!", "creating it without them; set APPWRITE_FUNCTION_API_KEY by hand afterwards:");
      log("!", `  console → Functions → ${FUNCTION_ID} → Settings → Environment variables`);
      result = await createFunction(candidates, null);
    }
    log("✔", `created function ${FUNCTION_ID} (runtime ${result.runtime})`);
    return result.runtime;
  }

  // Keep the runtime the function already has while the server still offers it:
  // re-pointing a working deployment at a newer runtime on every setup run would
  // be churn nobody asked for.
  const runtimeToUse = candidates.includes(existing.runtime) ? existing.runtime : runtime;
  const sameList = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort());

  const drift = [];
  if (existing.entrypoint !== FUNCTION_ENTRYPOINT) drift.push(`entrypoint → ${FUNCTION_ENTRYPOINT}`);
  if (existing.commands !== FUNCTION_BUILD_COMMANDS) drift.push(`build commands → ${FUNCTION_BUILD_COMMANDS}`);
  if (!sameList(existing.execute, ["users"])) drift.push(`execute → ["users"]`);
  if (!sameList(existing.scopes, FUNCTION_SCOPES)) drift.push(`scopes → ${FUNCTION_SCOPES.join(", ")}`);
  if (existing.runtime !== runtimeToUse) drift.push(`runtime → ${runtimeToUse}`);
  if (!existing.enabled) drift.push("enabled");

  if (drift.length === 0) {
    log("•", `function ${FUNCTION_ID} already configured`);
    return runtimeToUse;
  }

  log("•", `updating function ${FUNCTION_ID}: ${drift.join(", ")}`);
  const settings = {
    functionId: FUNCTION_ID,
    name: FUNCTION_NAME,
    runtime: runtimeToUse,
    execute: ["users"],
    enabled: true,
    logging: true,
    entrypoint: FUNCTION_ENTRYPOINT,
    commands: FUNCTION_BUILD_COMMANDS,
  };

  try {
    await functions.update({ ...settings, scopes: FUNCTION_SCOPES });
  } catch (error) {
    if (!isScopeProblem(error)) throw error;
    log("!", `this server would not accept the function's scopes (${error.message}) — leaving them alone`);
    await functions.update(settings);
  }

  return runtimeToUse;
}

/** Watch a deployment until it is live, printing status changes as dots. */
async function waitForDeployment(deploymentId, { timeoutMs = 300_000 } = {}) {
  const startedAt = Date.now();
  let lastStatus = null;
  let dots = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const deployment = await functions.getDeployment(FUNCTION_ID, deploymentId);

    if (deployment.status !== lastStatus) {
      process.stdout.write(`${lastStatus === null ? "  " : "\n  "}${deployment.status} `);
      lastStatus = deployment.status;
      dots = 0;
    } else {
      process.stdout.write(".");
      dots += 1;
    }

    if (deployment.status === "ready") {
      process.stdout.write("\n");
      return deployment;
    }

    if (/fail|cancel/i.test(deployment.status)) {
      process.stdout.write("\n");
      // The build log is the only place the real reason appears, and it lives on
      // the server. Print its tail here so a failure is diagnosable from the
      // terminal that ran setup.
      const logs = (deployment.buildLogs ?? "").trim();
      if (logs) console.error(`\n${logs.split("\n").slice(-30).join("\n")}\n`);
      throw new Error(`the build ${deployment.status}${deployment.buildStderr ? ` — ${deployment.buildStderr}` : ""}`);
    }

    await sleep(3000);
  }

  throw new Error(`the build did not finish within ${Math.round(timeoutMs / 1000)}s — check Functions → ${FUNCTION_ID} in the console`);
}

/** Package functions/join-group and deploy it. */
async function deployFunction({ force = false } = {}) {
  const { deployments } = await functions.listDeployments(FUNCTION_ID);
  const live = (deployments ?? []).find((deployment) => deployment.status === "ready" && deployment.activate);

  if (live && !force) {
    log("•", `join service already deployed and live (deployment ${live.$id})`);
    log("!", "re-run with --redeploy to ship the code currently in functions/join-group");
    return live;
  }

  const { buffer, files } = packageDirectory(FUNCTION_DIR);
  log("•", `packaging functions/join-group → ${files.length} files, ${(buffer.length / 1024).toFixed(1)} KB`);
  log("•", "uploading; the build usually takes under a minute…");

  const deployment = await functions.createDeployment({
    functionId: FUNCTION_ID,
    code: InputFile.fromBuffer(buffer, "code.tar.gz"),
    activate: true,
    entrypoint: FUNCTION_ENTRYPOINT,
    commands: FUNCTION_BUILD_COMMANDS,
  });

  const finished = await waitForDeployment(deployment.$id);
  log("✔", `deployed and activated ${FUNCTION_ID} (deployment ${finished.$id})`);
  return finished;
}

/**
 * Read the project back and say what is there.
 *
 * The app has its own Setup check (Tools → Document Manager → Setup check), but
 * printing the state here means a person who just ran this knows whether to
 * expect green rows before they open anything.
 */
async function reportState() {
  const lines = [];
  const ok = (label, detail) => lines.push(`   ✔ ${label}${detail ? ` — ${detail}` : ""}`);
  const bad = (label, detail) => lines.push(`   ✖ ${label}${detail ? ` — ${detail}` : ""}`);

  try {
    await databases.get({ databaseId: DATABASE_ID });
    ok(`database ${DATABASE_ID}`);
  } catch {
    bad(`database ${DATABASE_ID}`, "missing");
  }

  try {
    const bucket = await storage.getBucket({ bucketId: BUCKET_ID });
    ok(
      `bucket ${BUCKET_ID}`,
      `${Math.round(bucket.maximumFileSize / (1024 * 1024))} MB per file, ${bucket.allowedFileExtensions?.length ?? "?"} file types` +
        (bucket.antivirus ? ", antivirus on" : "") +
        (bucket.fileSecurity ? ", per-file permissions" : ""),
    );
  } catch {
    bad(`bucket ${BUCKET_ID}`, "missing");
  }

  for (const tableId of [GROUPS_TABLE_ID, FILES_TABLE_ID]) {
    try {
      const table = await tables.getTable({ databaseId: DATABASE_ID, tableId });
      ok(`table ${tableId}`, `${table.columns?.length ?? "?"} columns, ${table.indexes?.length ?? "?"} indexes`);
      if (!table.rowSecurity) {
        lines.push(`   ! ${tableId} has row security OFF — rows would not be team-scoped`);
      }
    } catch {
      bad(`table ${tableId}`, "missing");
    }
  }

  try {
    const fn = await functions.get(FUNCTION_ID);
    const { deployments } = await functions.listDeployments(FUNCTION_ID);
    const live = (deployments ?? []).find((deployment) => deployment.status === "ready" && deployment.activate);
    if (live) {
      ok(`function ${FUNCTION_ID}`, `runtime ${fn.runtime}, live deployment ${live.$id} (${fn.scopes?.length ?? 0} scopes)`);
    } else {
      bad(`function ${FUNCTION_ID}`, "no live deployment — re-run with --redeploy");
    }
  } catch {
    bad(`function ${FUNCTION_ID}`, "missing");
  }

  console.log(`\nWhat exists now:\n${lines.join("\n")}`);

  console.log(`
Next:

  Open the app → Tools → Document Manager → Setup check. All four rows should be
  green; if one is not, its own fix line says what to do.
`);
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

  await ensureFunction();

  if (ARGS.has("--skip-deploy")) {
    log("!", "--skip-deploy: leaving the deployed code as it is");
  } else {
    await deployFunction({ force: ARGS.has("--redeploy") });
  }

  await reportState();
}

main().catch((error) => {
  console.error(`\n✖ Setup failed: ${error?.message ?? error}\n`);

  if (error?.code === 401) {
    console.error("  The API key was rejected — check its scopes and that it belongs to this project.\n");
  } else if (error?.code === 403) {
    console.error(
      "  The key is valid but is missing a permission. Creating and deploying a\n" +
        "  function needs functions.write, on top of the Databases, Tables and\n" +
        "  Buckets scopes. Add it in the console and run this again.\n",
    );
  } else if (error?.code === 404) {
    console.error("  A resource this project should own was not found — re-run and let the script create it.\n");
  } else if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|fetch failed/i.test(error?.message ?? "")) {
    console.error("  Could not reach the Appwrite endpoint from here. Check the network and the endpoint URL.\n");
  }

  process.exit(1);
});
