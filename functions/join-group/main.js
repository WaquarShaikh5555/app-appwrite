const {
  Client,
  TablesDB,
  Storage,
  Teams,
} = require("node-appwrite");

/**
 * Appwrite Function: `join-group`
 *
 * The only way to turn an invite code into real group membership. It runs
 * server-side with an API key, which is what makes it safe: a client cannot add
 * itself to somebody else's team, so membership is never granted on the
 * client's say-so.
 *
 * Actions
 *   check         → proves the service is deployed and configured
 *   join          → { code } verifies the code and adds the caller to the team
 *
 * Environment (set on the function, not in the repo)
 *   APPWRITE_FUNCTION_API_KEY   API key with teams.read/teams.write + rows.read
 *   VAULT_DATABASE_ID           default: eternalz
 *   VAULT_GROUPS_TABLE_ID       default: vault_groups
 */

const crypto = require("crypto");

const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT ?? process.env.APPWRITE_ENDPOINT;
const PROJECT_ID = process.env.APPWRITE_FUNCTION_PROJECT_ID ?? process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_FUNCTION_API_KEY ?? process.env.APPWRITE_API_KEY;

const DATABASE_ID = process.env.VAULT_DATABASE_ID ?? "eternalz";
const GROUPS_TABLE_ID = process.env.VAULT_GROUPS_TABLE_ID ?? "vault_groups";

/** Must match services/vault/format.ts exactly. */
function normalizeJoinCode(code) {
  return String(code || "").replace(/[\s-]/g, "").toUpperCase();
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function timingSafeEqual(a, b) {
  const bufferA = Buffer.from(String(a), "utf8");
  const bufferB = Buffer.from(String(b), "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}

module.exports = async function main(context) {
  const { req, res, log, error } = context;

  const json = (payload, status = 200) => {
    res.json(payload, status);
    return res;
  };

  if (!API_KEY || !ENDPOINT || !PROJECT_ID) {
    error("Missing configuration: API key, endpoint or project id.");
    return json(
      { ok: false, message: "The join service is not configured correctly." },
      500,
    );
  }

  let body = {};
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {});
  } catch {
    return json({ ok: false, message: "Malformed request body." }, 400);
  }

  const action = body.action ?? "check";

  if (action === "check") {
    return json({ ok: true, message: "join-group service is live." });
  }

  if (action !== "join") {
    return json({ ok: false, message: `Unknown action: ${action}` }, 400);
  }

  const code = normalizeJoinCode(body.code);
  if (code.length < 6) {
    return json({ ok: false, message: "That code looks too short." }, 400);
  }

  // The caller identity comes from the execution headers Appwrite injects —
  // never from the request body, which a client could forge.
  const userId = req.headers["x-appwrite-user-id"];
  if (!userId) {
    return json(
      { ok: false, message: "You must be signed in to join a group." },
      401,
    );
  }

  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)
    .setKey(API_KEY);
  const tables = new TablesDB(client);
  const teams = new Teams(client);

  const Query = require("node-appwrite").Query;

  // 1. Find the group by the deterministic lookup hash (indexed).
  const lookup = sha256Hex(code);
  let found;
  try {
    const result = await tables.listRows({
      databaseId: DATABASE_ID,
      tableId: GROUPS_TABLE_ID,
      queries: [Query.equal("joinCodeLookup", lookup), Query.limit(1)],
    });
    found = result.rows?.[0];
  } catch (err) {
    error(`Lookup failed: ${err.message}`);
    return json({ ok: false, message: "Could not search for that code." }, 500);
  }

  if (!found) {
    // Same message as a wrong code — don't confirm which codes exist.
    return json({ ok: false, message: "That invite code is not valid." }, 404);
  }

  // 2. Confirm against the salted hash, in constant time.
  const expected = sha256Hex(`${found.joinCodeSalt}${code}`);
  if (!timingSafeEqual(expected, found.joinCodeHash)) {
    return json({ ok: false, message: "That invite code is not valid." }, 403);
  }

  // 3. Already a member? Joining twice should be harmless.
  try {
    const memberships = await teams.listMemberships({
      teamId: found.teamId,
      queries: [Query.equal("userId", userId), Query.limit(1)],
    });
    if ((memberships.memberships ?? []).length > 0) {
      return json({
        ok: true,
        teamId: found.teamId,
        groupId: found.$id,
        message: "You are already in this group.",
      });
    }
  } catch (err) {
    log(`Membership check failed, continuing: ${err.message}`);
  }

  // 4. Add the caller. Roles are deliberately minimal: membership grants
  //    read/write on the group's files and nothing else.
  try {
    await teams.createMembership({
      teamId: found.teamId,
      roles: ["member"],
      userId,
    });
  } catch (err) {
    error(`Membership creation failed: ${err.message}`);
    return json({ ok: false, message: "Could not add you to the group." }, 500);
  }

  log(`user ${userId} joined group ${found.$id}`);
  return json({
    ok: true,
    teamId: found.teamId,
    groupId: found.$id,
    message: "You're in. The group's documents are now available.",
  });
};
