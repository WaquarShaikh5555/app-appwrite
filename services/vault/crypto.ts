import * as Crypto from "expo-crypto";
import {
  joinCodeFromBytes,
  joinCodePayload,
  lookupPayload,
  saltFromBytes,
} from "./format";

/**
 * Invite-code generation and hashing.
 *
 * What this does and does not protect against — worth being precise:
 *
 * - The code is a shared secret the group owner passes to people they trust.
 *   It is never stored in plain text: only a salted hash plus a lookup hash.
 * - Verifying a code happens on the server (functions/join-group), which also
 *   performs the actual team membership creation. Authorization for reading
 *   files does NOT depend on this code at all — it is enforced by Appwrite via
 *   team permissions. A leaked code lets someone *join*, which the owner can
 *   revoke; it never grants silent read access to files.
 * - The vault tables are only readable by team members, so hashes are not
 *   exposed to outsiders. Combined with 80 bits of code entropy, offline
 *   guessing is not a realistic attack.
 */

export interface GeneratedJoinCode {
  /** Show this to the owner once — it is not recoverable afterwards. */
  code: string;
  /** Stored on the group row. */
  salt: string;
  hash: string;
  lookup: string;
}

async function sha256Hex(input: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export async function generateJoinCode(): Promise<GeneratedJoinCode> {
  // 16 bytes → 16 base32 chars ≈ 80 bits of entropy.
  const codeBytes = Crypto.getRandomBytes(16);
  const saltBytes = Crypto.getRandomBytes(16);
  const code = joinCodeFromBytes(codeBytes);
  const salt = saltFromBytes(saltBytes);
  return {
    code,
    salt,
    hash: await sha256Hex(joinCodePayload(salt, code)),
    lookup: await sha256Hex(lookupPayload(code)),
  };
}

/** Recompute the verification hash for a code the user typed. */
export async function hashJoinAttempt(
  salt: string,
  code: string,
): Promise<string> {
  return sha256Hex(joinCodePayload(salt, code));
}

/** Recompute the lookup hash for a code the user typed. */
export async function hashJoinLookup(code: string): Promise<string> {
  return sha256Hex(lookupPayload(code));
}
