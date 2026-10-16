# Document Manager

Private, invite-only file rooms for families and small teams — built into
Eternalz. Store PDFs, photos, spreadsheets, presentations and documents; share
them with people you invite by code; edit photos and PDFs without sending
anything to a third party.

This document covers how it works, how to set up the backend, and — importantly
— exactly what it does and does not protect. Nothing here is marketing copy.

---

## 1. What ships

| Capability | Where it runs |
| --- | --- |
| Create a group (own a vault) | Appwrite Teams + rows |
| Join by invite code | Appwrite Function `join-group` |
| Remove a member / leave / delete a group | Appwrite Teams + rows |
| Upload, download, preview, rename, delete files | Appwrite Storage |
| Photos → PDF (any photo format, batched) | On device (expo-image-manipulator + pdf-lib) |
| Photo editor: rotate, mirror, resize, compress | On device (expo-image-manipulator) |
| PDF tools: rotate, reorder, remove pages, merge | On device (pdf-lib) |
| PDF → image | **Not included** — see §6 |

Supported file types are an explicit allowlist: PDF, Office/OpenDocument
documents, spreadsheets and presentations, plain text/Markdown/CSV, and images
(JPEG, PNG, WebP, GIF, HEIC, BMP). Executables, scripts and archives are
rejected, so a vault cannot be turned into a malware drop box. Limit: 25 MB per
file (change `MAX_FILE_BYTES` in `constants/vault.ts` **and** the bucket settings
together).

---

## 2. Setup (once, ~5 minutes)

The app ships with hardcoded project identifiers (`6acf0e9b0034e6ac2483`,
`https://tor.cloud.appwrite.io/v1`), so nothing needs a `.env` file.

### 2.1 Provision the backend

```bash
APPWRITE_API_KEY=… node scripts/setup-appwrite.mjs
```

Create the API key first: **Appwrite console → Overview → Integrations → API keys**
with the `databases`, `tables`, `buckets`, `files` and `functions` scopes. The key
is read from the environment and never written to disk.

The script is idempotent — run it as often as you like. It creates:

- database `eternalz`
- bucket `vault-docs` — 25 MB cap, extension allowlist, file-level security,
  encryption at rest, antivirus scanning (falls back gracefully if the server
  plan doesn't support encryption or antivirus)
- tables `vault_groups` and `vault_files` with row-level security

If the console is more comfortable, the same things can be created by hand — see
the schema table in §4.

### 2.2 Deploy the join service

Invite codes are verified **server-side only**. A client can never add itself to
a foreign team, which is why joining goes through a function.

`pnpm vault:setup` does this: it creates the function, packages
`functions/join-group` as a tar.gz, uploads it, waits for the build and activates
the deployment with the scopes below set on the function itself. Run it again with
`--redeploy` after editing the function's code.

The scopes are what let it work without a key being pasted anywhere — Appwrite
injects `APPWRITE_FUNCTION_API_KEY` for a function that has them:

| Scope | Why |
| --- | --- |
| `teams.read` | Check whether the caller is already a member |
| `teams.write` | Add the caller to the group's team |
| `rows.read` | Read the group row holding the invite-code hash |

Doing it by hand instead (the Appwrite CLI, or **Functions → Create function** in
the console) also works; the equivalent CLI is:

```bash
cd functions/join-group
npm install
appwrite push function
```

Either way, if the function was created without scopes, add a key in the console
at **Functions → join-group → Settings → Environment variables**:

| Variable | Value |
| --- | --- |
| `APPWRITE_FUNCTION_API_KEY` | a key with `teams.read`, `teams.write`, `rows.read` |

`VAULT_DATABASE_ID` and `VAULT_GROUPS_TABLE_ID` default to `eternalz` and
`vault_groups`; override them only if you renamed things.

### 2.3 Verify

In the app: **Tools → Document Manager → Setup check**. It probes the bucket, both
tables and the function with real requests and reports exactly what is missing,
including a fix hint for each failure. It is the fastest way to confirm the
backend before you trust it with files.

### 2.4 Native builds

No extra config plugins are required — `expo-document-picker` works with no
permissions on Android and uses the iOS document browser.

One optional extra: to let iOS users browse **iCloud Drive** in the picker, add
the `expo-document-picker` config plugin with an iCloud container environment.
That adds `com.apple.developer.icloud-container-*` entitlements, which require an
iCloud container in your Apple Developer account — if you add it without that
setup, builds fail. It is intentionally **not** enabled by default.

---

## 3. How access control actually works

The invite code is *not* the security boundary. **Appwrite Teams are.**

```
                    ┌──────────────────────────────┐
   create group ───▶│ Team (owner = creator)       │
                    │  membership = access          │
                    └───────────┬──────────────────┘
                                │ used as the permission on every row and file
                                ▼
        vault_groups row  ──  vault_files rows  ──  storage files
        Permission.read/update/delete(Role.team(teamId))
```

- Every group is backed by an Appwrite Team. Creating a group creates the team;
  the creator becomes owner.
- Every row and every file is written with
  `Permission.read(Role.team(teamId))` (plus the uploader's user role). If you
  are not in the team, the **server** refuses the request — the UI hiding a
  button is not the mechanism.
- Joining is the only privileged operation the client cannot do, so the
  `join-group` function performs it, and only after verifying the code.

### What the invite code is

A 16-character code from an unambiguous alphabet (no `I`, `O`, `0`, `1`), stored
as a **salted SHA-256 hash**. The plain text is shown once at creation and is
never retrievable afterwards. Verifying an attempt means hashing it with the
stored salt and comparing in constant time (`crypto.timingSafeEqual`), so a
response cannot leak how much of a guess was right. Unknown and wrong codes
return the same message, so codes cannot be enumerated.

Treat it as a doorbell: it lets somebody *ask* to be let in. It never grants read
access on its own.

### Revocation

| Situation | Action | Effect |
| --- | --- | --- |
| Code leaked | Rotate invite code (group screen) | Old code stops working immediately; members are unaffected |
| Person should lose access | Remove membership | Their reads and downloads are refused server-side |
| Want out | Leave group | Membership removed |
| Start over | Delete group (owner) | Files, rows and the team are torn down |

Rotation does not evict existing members, and removal works even if a code is
still circulating.

---

## 4. Data model

**`vault_groups`** (row security on)

| Column | Type | Notes |
| --- | --- | --- |
| `name` | string(64) | |
| `description` | string(256) | optional |
| `teamId` | string(36) | the access boundary |
| `ownerId` | string(36) | |
| `joinCodeSalt` | string(64) | |
| `joinCodeHash` | string(64) | `sha256(salt + normalizedCode)` |
| `joinCodeLookup` | string(64) | `sha256(normalizedCode)`, indexed for O(1) lookup |

**`vault_files`** (row security on)

| Column | Type | Notes |
| --- | --- | --- |
| `groupId` | string(36) | indexed |
| `name` | string(255) | sanitised on write |
| `bucketFileId` | string(36) | indexed; the storage object |
| `size` | integer | |
| `mimeType` | string(128) | derived from the extension, not trusted from the client |
| `kind` | string(16) | `image` / `pdf` / `doc` / `sheet` / `slides` / `text` |
| `uploadedBy`, `uploadedByName` | string | attribution for the activity trail |

Note the two-hash design: `joinCodeLookup` exists only so the server can find the
group without scanning every row, and the salted hash is what actually decides
the answer. A stolen index dump does not reveal codes.

---

## 5. Threat model — honest version

**Covered**

- A non-member cannot list, download or delete anything, even with the file ID —
  permission checks happen server-side.
- Codes are unguessable (16 chars from a 32-symbol alphabet ≈ 2⁸⁰), salted, and
  compared in constant time; attempts are not distinguishable from each other.
- Uploads are type-restricted and size-capped; filenames are sanitised against
  path traversal, control characters and hidden-file tricks.
- Files are encrypted in transit and at rest, and scanned for known malware on
  upload when the plan supports it.
- Editing is local: photos and PDFs are processed on the device and re-uploaded
  by the app itself. No third-party service ever receives your files.
- No clobber risk on edits: an edited file is written as a *new* object and the
  row is only repointed after the upload succeeds. A failed edit never destroys
  the original.

**Not covered — know these before storing anything sensitive**

- **This is not end-to-end encrypted.** Encryption keys are Appwrite's, so a
  project administrator (including you, in the console) can read stored files.
  If the requirement is "not even the server operator can read it", you need
  client-side encryption before upload — a different design, with real costs
  (no server-side previews or thumbnails, key loss means data loss).
- **Any member can delete any file in the group.** That is deliberate — it suits
  a family or a small trusted team. Per-uploader-only deletion or read-only
  members would need a stricter permission set on each file.
- **A leaked code admits a stranger** until you rotate it or remove them. Codes
  are not bound to an email address, so there is no approval step.
- **Metadata is visible**: group name, file names, sizes, and who uploaded what
  are stored as plain rows. Only the file bytes are opaque to a casual reader.
- **Deleting a file removes the row and the storage object together.** If a
  storage delete fails, the row is deliberately kept as an orphan so nothing is
  silently lost; a cleanup pass is a known follow-up.
- **No client-side content moderation.** The app refuses dangerous *file types*,
  not dangerous *content*.
- **A note for anyone extending the tools:** React Native's `fetch` cannot
  reliably read `file://` URIs on a device. Local files go through
  `expo-file-system` (`services/vault/files.ts → uriToBytes`), which is why that
  helper is shared rather than re-implemented per screen. On web the same helper
  handles `data:` and `blob:` URIs.

---

## 6. The tools, and one deliberate omission

Everything offered is either pure JavaScript or an Expo module that exists on all
platforms, so the same code runs in the browser, on Android and on iOS:

- **Photo editor** — rotate, mirror, resize (cap the long edge), compress, and
  choose JPEG or PNG. Rendered with `expo-image-manipulator`.
- **PDF tools** — rotate individual pages, reorder, remove pages, and merge
  another PDF from the same group. Rendered with `pdf-lib`.
- **Photos → PDF** — on the group screen, pick any number of photos and the app
  assembles them into a PDF, one photo per A4 page, centred, with the date in the
  filename. This is the one tool that exists *because* of a platform quirk done
  properly: cameras hand back HEIC, and pdf-lib can only embed JPEG and PNG, so
  every photo is decoded, capped at a 2000 px long edge and re-encoded as JPEG
  before embedding. A 20-photo album therefore lands at a few megabytes instead
  of a hundred — and the photos themselves are never uploaded. Only the finished
  PDF is.

**PDF → image is not included, and that is a decision rather than a gap.** Turning
a PDF page into a bitmap requires a rasteriser (PDFium, MuPDF, `pdf.js` with its
worker and canvas plumbing). Shipping one would mean either a large native module
and a custom development build (no more Expo Go), or a worker-based web path that
behaves differently on each platform. Neither is worth smuggling in silently for
an app whose value is that a family can open it and trust it. If you want it:

1. **Web-only, good quality** — add `pdfjs-dist`, render to a canvas off the main
   thread, export PNG/JPEG. Keeps native builds untouched.
2. **All platforms, best quality** — add a PDFium-based native module
   (`react-native-pdf-thumbnail` or similar) and move to a development build.

Either way the work is contained: `services/vault/pdf.ts` already owns the PDF
logic, and the UI already routes PDFs to a tools screen.

The same reasoning applies to **editing text inside a PDF** (adding text,
redaction, annotations): pdf-lib can technically draw text, but a real editor
needs layout, font embedding and a viewer. Not shipping a bad one.

---

## 7. Responsible use

- Upload only what you have the right to store. A shared family folder is not a
  licence to redistribute someone else's documents; copyright still applies.
- Keep codes inside the group. If a vault holds IDs, medical records or financial
  documents, remove people the moment they should lose access — and prefer
  rotating the code as well if it was shared in a chat that others can read.
- Every action is attributed to an account, so don't share logins.
- Nothing here determines whether content is lawful in your jurisdiction. That
  responsibility stays with the person uploading.

---

## 8. Testing, and what is not tested

```bash
node scripts/test-vault-logic.mjs
```

Runs offline with no device and no network: the base64 codecs (against Node's own
implementation), filename sanitising and type gating, join-code normalisation and
hashing — **extracted from the real `format.ts` and `main.js` sources and compared
against each other**, so the client and the deployed function can never silently
disagree — and every PDF operation (rotate, delete, reorder, merge, extract)
saved and reloaded through pdf-lib.

Also verified in CI terms: `npx tsc --noEmit` and `pnpm build` (the web export
prerenders all routes, so an import or render crash fails the build).

**Not tested here, and why:** anything that needs a live backend or a device —
sign-in, team creation, the join function, uploads, thumbnails. Appwrite's cloud
endpoint is unreachable from the build sandbox. The instrument for those is the
in-app **Setup check** screen (§2.3): run it on a real device against the real
project and it will tell you precisely which piece is missing.
