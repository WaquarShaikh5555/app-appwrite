/** Rows and shapes used by the Document Manager. */

export interface VaultGroup {
  $id: string;
  $createdAt: string;
  name: string;
  description: string;
  /** Appwrite Team that owns the group's access. */
  teamId: string;
  ownerId: string;
  /** Salted hash of the invite code — used to verify a join attempt. */
  joinCodeHash: string;
  /** Random salt mixed into the join-code hash. */
  joinCodeSalt: string;
  /** Deterministic hash of the code, so the join function can look it up by index. */
  joinCodeLookup: string;
}

export type VaultFileKind =
  | "image"
  | "pdf"
  | "sheet"
  | "document"
  | "slides"
  | "other";

export interface VaultFileRow {
  $id: string;
  $createdAt: string;
  groupId: string;
  /** Display name shown in the UI. */
  name: string;
  /** Storage file id inside the bucket. */
  bucketFileId: string;
  size: number;
  mimeType: string;
  kind: VaultFileKind;
  uploadedBy: string;
  uploadedByName: string;
}

export interface VaultMember {
  membershipId: string;
  userId: string;
  userName: string;
  userEmail: string;
  /** True for the person who created the group. */
  isOwner: boolean;
  /** True when this membership belongs to the signed-in user. */
  isSelf: boolean;
  joinedAt: string;
}

/** Result of asking the join function to act on a code. */
export interface JoinResult {
  ok: boolean;
  teamId?: string;
  groupId?: string;
  message: string;
}

export interface DiagnosticCheck {
  id: string;
  label: string;
  detail: string;
  status: "ok" | "missing" | "warning" | "error";
  /** What the user should do when this check fails. */
  fix?: string;
}
