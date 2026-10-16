#!/usr/bin/env node
/**
 * End-to-end test of scripts/setup-appwrite.mjs against a local stand-in for the
 * Appwrite API.
 *
 *   node scripts/test-setup-flow.mjs
 *
 * The setup script is the one thing a person runs with their API key, and until
 * now the first time it ever ran against a real server was in their hands. This
 * starts an HTTP server that answers the handful of endpoints the script uses —
 * databases, buckets, tables, columns, indexes, functions, runtimes, deployments
 * — and runs the real script against it as a child process, so the code paths
 * that matter are exercised for real: creation, idempotency, drift repair,
 * deployment polling, and what a failed build reports.
 *
 * It cannot prove anything about Appwrite itself, only about what this script
 * sends and does with what comes back — which is exactly the part that was
 * unverified.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";

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

/* ── The stand-in server ────────────────────────────────────────────────────── */

function createMockAppwrite() {
  const state = {
    database: null,
    bucket: null,
    tables: {},
    function: null,
    deployments: [],
    /** Set to "failed" to make the next build fail. */
    deployOutcome: "ready",
    /** Strip a field off the function on GET to simulate drift. */
    drift: null,
    calls: [],
  };

  const now = "2026-01-01T00:00:00.000Z";

  const table = (id, name, columns, indexes) => ({
    $id: id,
    $createdAt: now,
    $updatedAt: now,
    databaseId: "eternalz",
    name,
    enabled: true,
    rowSecurity: true,
    columns: columns.map((column) => ({ key: column.key ?? column, status: "available" })),
    indexes,
    bytesMax: 0,
    bytesUsed: 0,
    total: columns.length,
  });

  const deployment = (id, status, extra = {}) => ({
    $id: id,
    $createdAt: now,
    $updatedAt: now,
    resourceId: "join-group",
    resourceType: "function",
    entrypoint: "main.js",
    sourceSize: 2331,
    buildSize: 0,
    totalSize: 0,
    buildId: "build-1",
    activate: true,
    status,
    buildLogs: "",
    buildDuration: 1,
    providerRepositoryName: "",
    providerRepositoryOwner: "",
    providerRepositoryUrl: "",
    providerCommitHash: "",
    providerCommitAuthorUrl: "",
    providerCommitAuthor: "",
    providerCommitMessage: "",
    providerCommitCreatedAt: "",
    providerBranch: "",
    providerBranchUrl: "",
    ...extra,
  });

  const functionModel = () => {
    const base = {
      $id: "join-group",
      $createdAt: now,
      $updatedAt: now,
      execute: ["users"],
      name: "join-group",
      enabled: true,
      live: state.deployments.some((entry) => entry.status === "ready" && entry.activate),
      logging: true,
      runtime: "node-22",
      deployment: state.deployments.find((entry) => entry.activate)?.$id ?? "",
      vars: [],
      events: [],
      schedule: "",
      timeout: 15,
      entrypoint: "main.js",
      commands: "npm install",
      scopes: ["teams.read", "teams.write", "rows.read"],
      installationId: "",
      providerRepositoryId: "",
      providerBranch: "",
      providerRootDirectory: "",
      providerSilentMode: false,
      specification: "",
      buildSpecification: "",
      runtimeSpecification: "",
    };

    // Simulate settings that have drifted from what the repo wants.
    if (state.drift === "entrypoint") base.entrypoint = "index.js";
    if (state.drift === "scopes") base.scopes = [];
    return base;
  };

  const server = createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const url = new URL(request.url, "http://localhost");
      const path = url.pathname.replace(/^\/v1/, "");
      const method = request.method ?? "GET";
      state.calls.push(`${method} ${path}`);

      const send = (status, body) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(JSON.stringify(body));
      };
      const missing = (what) => send(404, { message: `${what} not found`, code: 404, type: "document_not_found" });

      // Databases
      if (path === "/databases" && method === "POST") {
        state.database = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        return send(201, { $id: "eternalz", $createdAt: now, $updatedAt: now, name: "Eternalz", enabled: true });
      }
      if (path === "/databases/eternalz" && method === "GET") {
        return state.database ? send(200, { $id: "eternalz", name: "Eternalz" }) : missing("database");
      }

      // Buckets
      if (path === "/storage/buckets" && method === "POST") {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        state.bucket = {
          $id: "vault-docs",
          name: body.name ?? "Eternalz documents",
          maximumFileSize: body.maximumFileSize ?? 0,
          allowedFileExtensions: body.allowedFileExtensions ?? [],
          antivirus: Boolean(body.antivirus),
          fileSecurity: Boolean(body.fileSecurity),
          encryption: Boolean(body.encryption),
          compression: "none",
          enabled: true,
        };
        return send(201, state.bucket);
      }
      if (path === "/storage/buckets/vault-docs" && method === "GET") {
        return state.bucket ? send(200, state.bucket) : missing("bucket");
      }

      // Tables, columns, indexes
      const tablesMatch = path.match(
        /^\/tablesdb\/eternalz\/tables(?:\/([^/]+))?(?:\/columns\/(string|integer)|\/(indexes))?$/,
      );
      if (tablesMatch) {
        // One match, destructured once: an earlier version re-matched and then
        // skipped a group, so the table id came out as the column type.
        const [, tableId, columnType, indexesFlag] = tablesMatch;

        if (method === "POST" && !tableId) {
          const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          state.tables[body.tableId] = table(body.tableId, body.name, [], []);
          return send(201, state.tables[body.tableId]);
        }

        if (tableId && method === "GET" && !columnType && !indexesFlag) {
          return state.tables[tableId] ? send(200, state.tables[tableId]) : missing("table");
        }

        if (tableId && columnType && method === "POST") {
          const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          const entry = state.tables[tableId];
          if (!entry) return missing("table");
          entry.columns.push({ key: body.key, status: "available" });
          return send(201, { key: body.key, status: "available" });
        }

        if (tableId && indexesFlag && method === "POST") {
          const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
          const entry = state.tables[tableId];
          if (!entry) return missing("table");
          entry.indexes.push({ key: body.key, type: "key", status: "available", columns: body.columns });
          return send(201, { key: body.key, status: "available" });
        }
      }

      // Functions
      if (path === "/functions/runtimes" && method === "GET") {
        return send(200, {
          total: 3,
          runtimes: [
            { $id: "node-22", key: "node-22", name: "Node.js", version: "22", base: "node", image: "node:22", logo: "", supports: [] },
            { $id: "node-20.0", key: "node-20.0", name: "Node.js", version: "20", base: "node", image: "node:20", logo: "", supports: [] },
            { $id: "php-8.3", key: "php-8.3", name: "PHP", version: "8.3", base: "php", image: "php:8.3", logo: "", supports: [] },
          ],
        });
      }
      if (path === "/functions" && method === "POST") {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        if (!String(body.runtime ?? "").startsWith("node-")) {
          return send(400, { message: `Invalid runtime: ${body.runtime}`, code: 400 });
        }
        state.function = body;
        return send(201, functionModel());
      }
      if (path === "/functions/join-group" && method === "GET") {
        return state.function ? send(200, functionModel()) : missing("function");
      }

      const deploymentListMatch = path.match(/^\/functions\/join-group\/deployments$/);
      if (deploymentListMatch && method === "GET") {
        return send(200, { total: state.deployments.length, deployments: state.deployments });
      }
      if (deploymentListMatch && method === "POST") {
        const id = `dep-${state.deployments.length + 1}`;
        state.deployments.push(deployment(id, "building", { sourceSize: Buffer.concat(chunks).length }));
        // The second poll flips to the configured outcome, so the polling loop
        // is exercised rather than jumping straight to a result.
        setTimeout(() => {
          const entry = state.deployments.find((item) => item.$id === id);
          if (!entry) return;
          if (state.deployOutcome === "failed") {
            entry.status = "failed";
            entry.buildLogs = "npm ERR! code E404\nnpm ERR! 404 Not Found - GET https://registry.npmjs.org/node-appwrite\n";
          } else {
            entry.status = "ready";
          }
        }, 1200);
        return send(202, state.deployments.at(-1));
      }
      const deploymentGetMatch = path.match(/^\/functions\/join-group\/deployments\/([^/]+)$/);
      if (deploymentGetMatch && method === "GET") {
        const entry = state.deployments.find((item) => item.$id === deploymentGetMatch[1]);
        return entry ? send(200, entry) : missing("deployment");
      }
      if (path === "/functions/join-group" && (method === "PATCH" || method === "PUT")) {
        const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
        state.function = { ...state.function, ...body, driftReset: true };
        state.drift = null;
        return send(200, functionModel());
      }

      return missing(`route ${method} ${path}`);
    });
  });

  return { server, state };
}

/* ── Running the script ─────────────────────────────────────────────────────── */

function runSetup(endpoint, { deployOutcome } = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/setup-appwrite.mjs"], {
      env: {
        ...process.env,
        APPWRITE_ENDPOINT: endpoint,
        APPWRITE_PROJECT_ID: "6acf0e9b0034e6ac2483",
        APPWRITE_API_KEY: "test-key-not-real",
        ...(deployOutcome ? {} : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function withMock(run) {
  const { server, state } = createMockAppwrite();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run({ endpoint: `http://127.0.0.1:${port}/v1`, state });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

/* ── The checks ─────────────────────────────────────────────────────────────── */

section("First run: everything gets created");
await withMock(async ({ endpoint, state }) => {
  const { code, stdout, stderr } = await runSetup(endpoint);
  check("exits 0", code === 0, `exit ${code}\n${stderr.slice(0, 400)}`);
  check("creates the database", /created database eternalz/.test(stdout));
  check("creates the bucket", /created bucket vault-docs/.test(stdout));
  check("creates both tables", /created table vault_groups/.test(stdout) && /created table vault_files/.test(stdout));
  check("creates the columns", /vault_groups\.joinCodeHash/.test(stdout) && /vault_files\.bucketFileId/.test(stdout));
  check("creates the indexes", /vault_groups index join_lookup/.test(stdout));
  check("creates the function", /created function join-group/.test(stdout));
  check("picks the newest runtimes the server offers", /runtime node-22/.test(stdout), stdout.match(/created function[^\n]*/)?.[0]);
  check("uploads a deployment", /uploading/.test(stdout), stdout.slice(-300));
  check("waits for the build and activates it", /deployed and activated join-group/.test(stdout));
  check("reports the state at the end", /What exists now:/.test(stdout));
  check(
    "every report line is a tick, not a cross",
    !/✖/.test(stdout.slice(stdout.indexOf("What exists now:"))),
    stdout.slice(stdout.indexOf("What exists now:")),
  );
  check(
    "the function is listed with its scopes",
    /function join-group — runtime node-22, live deployment dep-\d \(3 scopes\)/.test(stdout),
    stdout.slice(stdout.indexOf("What exists now:")),
  );
  check("the deployment body was a multipart upload", state.calls.includes("POST /functions/join-group/deployments"));
});

section("Second run: idempotent");
await withMock(async ({ endpoint, state }) => {
  await runSetup(endpoint);
  const second = await runSetup(endpoint);
  check("exits 0", second.code === 0, `exit ${second.code}`);
  check("leaves the database alone", /database eternalz already exists/.test(second.stdout));
  check("leaves the bucket alone", /bucket vault-docs already exists/.test(second.stdout));
  check("leaves the tables alone", /table vault_groups already exists/.test(second.stdout));
  check("sees the function as already configured", /function join-group already configured/.test(second.stdout));
  check("does not rebuild the function", /already deployed and live/.test(second.stdout));
  check(
    "hints that --redeploy ships new code",
    /--redeploy/.test(second.stdout),
    second.stdout.split("\n").filter((line) => line.includes("redeploy")).join(" | "),
  );
  check("only one deployment exists on the server", state.deployments.length === 1, `${state.deployments.length}`);
});

section("Drifted settings get repaired");
await withMock(async ({ endpoint, state }) => {
  await runSetup(endpoint);
  state.drift = "entrypoint"; // someone edited it in the console
  const third = await runSetup(endpoint);
  check("exits 0", third.code === 0, `exit ${third.code}`);
  check("names what drifted", /updating function join-group: entrypoint → main\.js/.test(third.stdout), third.stdout.match(/updating function[^\n]*/)?.[0]);
  const fourth = await runSetup(endpoint);
  check("the repair sticks: the next run finds nothing to change", /function join-group already configured/.test(fourth.stdout), fourth.stdout.match(/function join-group[^\n]*/)?.[0]);
});

section("--redeploy rebuilds on demand");
await withMock(async ({ endpoint, state }) => {
  await runSetup(endpoint);
  const redeploy = await new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/setup-appwrite.mjs", "--redeploy"], {
      env: { ...process.env, APPWRITE_ENDPOINT: endpoint, APPWRITE_PROJECT_ID: "6acf0e9b0034e6ac2483", APPWRITE_API_KEY: "test-key-not-real" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    child.on("close", (code) => resolve({ code, stdout }));
  });
  check("exits 0", redeploy.code === 0, `exit ${redeploy.code}`);
  check("uploads a second deployment", state.deployments.length === 2, `${state.deployments.length}`);
  check("re-uploads rather than skipping", /deployed and activated join-group/.test(redeploy.stdout));
});

section("A failed build is reported, not swallowed");
await withMock(async ({ endpoint, state }) => {
  state.deployOutcome = "failed";
  const { code, stdout, stderr } = await runSetup(endpoint);
  check("exits non-zero", code === 1, `exit ${code}`);
  check("says the build failed", /the build failed/.test(stderr), stderr.slice(-300));
  check("prints the build log tail", /npm ERR! 404 Not Found/.test(stderr), stderr.slice(-400));
  check("does not claim success", !/deployed and activated/.test(stdout));
});

section("The endpoint for a real run is yours, not the mock");
{
  const script = await import("node:fs").then((fs) => fs.readFileSync("scripts/setup-appwrite.mjs", "utf8"));
  check("defaults to the Eternalz endpoint", script.includes("https://tor.cloud.appwrite.io/v1"));
  check("defaults to the Eternalz project", script.includes("6acf0e9b0034e6ac2483"));
  check("the key is read from the environment or prompted, never hardcoded", !/setKey\("(?!API_KEY)/.test(script.replace(/setKey\(API_KEY\)/, "")));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
