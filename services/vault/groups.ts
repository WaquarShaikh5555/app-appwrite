import { AppwriteException, ExecutionMethod, ID, Permission, Query, Role } from "appwrite";
import {
  account,
  functions,
  tablesDB,
  teams,
} from "@/constants/appwrite";
import { VAULT } from "@/constants/vault";
import type { JoinResult, VaultGroup, VaultMember } from "@/types/vault";
import { generateJoinCode } from "./crypto";
import { deleteStorageFile, deleteVaultFileRow, listGroupFiles } from "./files";

/** Group rows are readable only by the owning team, never by outsiders. */
function groupPermissions(teamId: string, ownerId: string): string[] {
  return [
    Permission.read(Role.team(teamId)),
    Permission.update(Role.team(teamId)),
    // The creator keeps access even if they later leave the team.
    Permission.read(Role.user(ownerId)),
    Permission.update(Role.user(ownerId)),
    Permission.delete(Role.user(ownerId)),
  ];
}

function asGroup(row: unknown): VaultGroup {
  return row as VaultGroup;
}

/**
 * Create a group: an Appwrite Team (the real access boundary) plus a metadata
 * row only that team can read. The invite code is generated here, hashed, and
 * shown to the owner exactly once.
 */
export async function createVaultGroup(params: {
  name: string;
  description: string;
  userId: string;
}): Promise<{ group: VaultGroup; code: string }> {
  const name = params.name.trim();
  if (name.length < 2) throw new Error("Give the group a name (2+ characters).");

  // `teams.create` makes the caller the team owner automatically.
  const team = await teams.create({
    teamId: ID.unique(),
    name,
    roles: ["owner", "member"],
  });

  try {
    const code = await generateJoinCode();

    const row = await tablesDB.createRow({
      databaseId: VAULT.databaseId,
      tableId: VAULT.groupsTableId,
      rowId: ID.unique(),
      data: {
        name,
        description: params.description.trim(),
        teamId: team.$id,
        ownerId: params.userId,
        joinCodeSalt: code.salt,
        joinCodeHash: code.hash,
        joinCodeLookup: code.lookup,
      },
      permissions: groupPermissions(team.$id, params.userId),
    });

    return { group: asGroup(row), code: code.code };
  } catch (error) {
    // Never leave an orphaned team behind if the row could not be written.
    await teams.delete({ teamId: team.$id }).catch(() => {});
    throw error;
  }
}

/** Groups the signed-in user can see — Appwrite filters by team permission. */
export async function listVaultGroups(): Promise<VaultGroup[]> {
  const result = await tablesDB.listRows({
    databaseId: VAULT.databaseId,
    tableId: VAULT.groupsTableId,
    queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
  });
  return (result.rows ?? []).map(asGroup);
}

export async function getVaultGroup(groupId: string): Promise<VaultGroup> {
  return asGroup(
    await tablesDB.getRow({
      databaseId: VAULT.databaseId,
      tableId: VAULT.groupsTableId,
      rowId: groupId,
    }),
  );
}

export async function updateVaultGroup(
  groupId: string,
  data: { name?: string; description?: string },
): Promise<void> {
  await tablesDB.updateRow({
    databaseId: VAULT.databaseId,
    tableId: VAULT.groupsTableId,
    rowId: groupId,
    data,
  });
}

/** Issue a fresh invite code. Every previously shared code stops working. */
export async function rotateJoinCode(group: VaultGroup): Promise<string> {
  const code = await generateJoinCode();
  await tablesDB.updateRow({
    databaseId: VAULT.databaseId,
    tableId: VAULT.groupsTableId,
    rowId: group.$id,
    data: {
      joinCodeSalt: code.salt,
      joinCodeHash: code.hash,
      joinCodeLookup: code.lookup,
    },
  });
  return code.code;
}

/**
 * Join a group with an invite code. Membership is created server-side by the
 * `join-group` function: a client cannot add itself to somebody else's team,
 * which is precisely what keeps this safe.
 */
export async function joinGroupWithCode(rawCode: string): Promise<JoinResult> {
  const code = rawCode.trim();
  if (code.length < 6) return { ok: false, message: "That code looks too short." };

  let responseBody = "";
  try {
    const execution = await functions.createExecution({
      functionId: VAULT.joinFunctionId,
      body: JSON.stringify({ action: "join", code }),
      method: ExecutionMethod.POST,
    });
    responseBody = execution.responseBody ?? "";
  } catch (error) {
    const detail =
      error instanceof AppwriteException
        ? `${error.message}${error.code ? ` (${error.code})` : ""}`
        : error instanceof Error
          ? error.message
          : "Unknown error";
    return {
      ok: false,
      message:
        `Could not reach the join service: ${detail}. ` +
        `Run \`pnpm vault:setup\` to deploy it, then try again.`,
    };
  }

  try {
    const parsed = JSON.parse(responseBody) as Partial<JoinResult>;
    return {
      ok: Boolean(parsed.ok),
      teamId: parsed.teamId,
      groupId: parsed.groupId,
      message: parsed.message ?? (parsed.ok ? "Joined." : "Could not join."),
    };
  } catch {
    return {
      ok: false,
      message:
        "The join service replied with something unexpected. Check that the " +
        "deployed `join-group` function is up to date.",
    };
  }
}

/** Members of a group, read from its Appwrite team. */
export async function listGroupMembers(teamId: string): Promise<VaultMember[]> {
  const currentUser = await account.get().catch(() => null);
  try {
    const result = await teams.listMemberships({
      teamId,
      queries: [Query.limit(200)],
    });
    return (result.memberships ?? []).map((membership) => ({
      membershipId: membership.$id,
      userId: membership.userId,
      userName: membership.userName || "Member",
      userEmail: membership.userEmail,
      isOwner: Boolean(membership.roles?.includes("owner")),
      isSelf: currentUser?.$id === membership.userId,
      joinedAt: membership.$createdAt,
    }));
  } catch {
    // Non-fatal: the file list still works without the member list.
    return [];
  }
}

/**
 * Remove a membership. Owners can remove anyone; a member removing their own
 * membership is "leave group". Appwrite decides who is actually allowed.
 */
export async function removeMember(params: {
  teamId: string;
  membershipId: string;
}): Promise<void> {
  await teams.deleteMembership({
    teamId: params.teamId,
    membershipId: params.membershipId,
  });
}

/** Delete a group: its files, its rows, then the team that guarded them. */
export async function deleteVaultGroup(group: VaultGroup): Promise<void> {
  const files = await listGroupFiles(group.$id).catch(() => []);
  for (const file of files) {
    await deleteStorageFile(file.bucketFileId).catch(() => {});
    await deleteVaultFileRow(file.$id).catch(() => {});
  }
  await tablesDB
    .deleteRow({
      databaseId: VAULT.databaseId,
      tableId: VAULT.groupsTableId,
      rowId: group.$id,
    })
    .catch(() => {});
  await teams.delete({ teamId: group.teamId }).catch(() => {});
}
