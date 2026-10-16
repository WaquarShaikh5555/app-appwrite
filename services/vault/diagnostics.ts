import { AppwriteException, ExecutionMethod, Query } from "appwrite";
import { functions, storage, tablesDB } from "@/constants/appwrite";
import { VAULT } from "@/constants/vault";
import type { DiagnosticCheck } from "@/types/vault";

/**
 * Setup checks.
 *
 * The client SDK can't ask "does this bucket/table/function exist?" directly —
 * those endpoints are server-side only. So each check performs the cheapest
 * real operation that would fail if the resource were missing, and reads the
 * status code to work out what is wrong. That turns a silent, confusing failure
 * into an actionable one.
 */

function describe(error: unknown): { status: DiagnosticCheck["status"]; detail: string } {
  if (error instanceof AppwriteException) {
    const code = error.code ?? 0;
    if (code === 404) return { status: "missing", detail: error.message };
    if (code === 401 || code === 403) {
      return { status: "warning", detail: error.message };
    }
    return { status: "error", detail: `${error.message} (${code})` };
  }
  return {
    status: "error",
    detail: error instanceof Error ? error.message : "Unknown error",
  };
}

async function checkBucket(): Promise<DiagnosticCheck> {
  const base = {
    id: "bucket",
    label: "Storage bucket",
    detail: VAULT.bucketId,
  };
  try {
    await storage.listFiles({
      bucketId: VAULT.bucketId,
      queries: [Query.limit(1)],
    });
    return { ...base, status: "ok", detail: `${VAULT.bucketId} — reachable` };
  } catch (error) {
    const { status, detail } = describe(error);
    return {
      ...base,
      status,
      detail,
      fix:
        status === "missing"
          ? "Run scripts/setup-appwrite.mjs, or create the bucket in the Appwrite console."
          : "Make sure you are signed in and the bucket grants `create` to users.",
    };
  }
}

async function checkTable(id: string, label: string, tableId: string): Promise<DiagnosticCheck> {
  try {
    await tablesDB.listRows({
      databaseId: VAULT.databaseId,
      tableId,
      queries: [Query.limit(1)],
    });
    return { id, label, status: "ok", detail: `${VAULT.databaseId}/${tableId} — reachable` };
  } catch (error) {
    const { status, detail } = describe(error);
    return {
      id,
      label,
      status,
      detail,
      fix:
        status === "missing"
          ? "Run scripts/setup-appwrite.mjs to create the table, its columns and its indexes."
          : "Check the table's permissions — row security must be on so rows stay team-scoped.",
    };
  }
}

async function checkJoinFunction(): Promise<DiagnosticCheck> {
  const base = { id: "function", label: "Join service (function)", detail: VAULT.joinFunctionId };
  try {
    const execution = await functions.createExecution({
      functionId: VAULT.joinFunctionId,
      body: JSON.stringify({ action: "check" }),
      method: ExecutionMethod.POST,
    });
    const ok = execution.responseBody?.includes('"ok":true');
    return {
      ...base,
      status: ok ? "ok" : "warning",
      detail: ok
        ? `${VAULT.joinFunctionId} — responding`
        : `Replied, but not with the expected payload: ${execution.responseBody?.slice(0, 120) ?? ""}`,
    };
  } catch (error) {
    const { status, detail } = describe(error);
    return {
      ...base,
      status,
      detail,
      fix:
        "Run `pnpm vault:setup` — it deploys the join service, which invite codes need.",
    };
  }
}

export async function runVaultDiagnostics(): Promise<DiagnosticCheck[]> {
  const [bucket, groups, files, joinFunction] = await Promise.all([
    checkBucket(),
    checkTable("groups-table", "Groups table", VAULT.groupsTableId),
    checkTable("files-table", "Files table", VAULT.filesTableId),
    checkJoinFunction(),
  ]);
  return [bucket, groups, files, joinFunction];
}
