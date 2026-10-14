import { Account, Client } from "appwrite";

/**
 * Appwrite project details.
 *
 * Baked in so the app runs with no `.env` file. `EXPO_PUBLIC_*` env vars still
 * take precedence if you add them later.
 *
 *   Project name : Eternalz
 *   Project ID   : 6acf0e9b0034e6ac2483
 *   Region       : tor (Toronto) -> https://tor.cloud.appwrite.io/v1
 */
export const APPWRITE_ENDPOINT =
  process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ??
  "https://tor.cloud.appwrite.io/v1";

export const APPWRITE_PROJECT_ID =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? "6acf0e9b0034e6ac2483";

export const APPWRITE_PROJECT_NAME =
  process.env.EXPO_PUBLIC_APPWRITE_PROJECT_NAME ?? "Eternalz";

/** Shared Appwrite client. Import this instead of constructing a new Client. */
export const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

/** Auth service — sign up, log in, log out, current user. */
export const account = new Account(client);
