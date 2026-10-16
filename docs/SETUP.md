# Setting up the Document Manager

This guide assumes **nothing**. If you've never opened a terminal, read
[Part 1](#part-1--where-commands-run) first — it answers exactly that.

There are two ways to set up the backend. Pick one:

| | Path A — no terminal | Path B — one command |
| --- | --- | --- |
| **Best for** | Never used a terminal | Comfortable with a terminal |
| **You need** | A browser | A browser + Node.js + the code on your computer |
| **Effort** | ~10 min of clicking | ~2 min |
| **How** | Create resources by hand in the Appwrite console | Run `pnpm vault:setup` and it makes everything |
| **Covers** | Parts 3A and 4 | Part 3B only — it also creates the function, deploys it and gives it its scopes |

Path B needs an API key and nothing else; after it finishes there is no Part 4 to
do. Path A is for when there is no terminal available at all, and Part 4 explains
the manual function deployment it requires.

---

## Part 1 — Where commands run

**Nowhere inside Appwrite.** The Appwrite console is a website: you click things
there. It has no terminal, no command box, no place to type `node …`.

Commands run on **your own computer**, in a program called a terminal:

| Your computer | How to open a terminal |
| --- | --- |
| **Windows** | Press `Win`, type `powershell`, press Enter |
| **macOS** | Press `Cmd + Space`, type `terminal`, press Enter |
| **Linux** | `Ctrl + Alt + T` (or search "terminal") |

The two things to know:

- **`cd` means "go to this folder"** — you must be *inside* the project folder
  before running the project's commands.
- **You need the code on your computer first.** If you haven't got it, download
  it from GitHub (**Code → Download ZIP**, then unzip) or run
  `git clone https://github.com/WaquarShaikh5555/app-appwrite.git`.

Two commands tell you if you're ready:

```bash
cd app-appwrite     # the unzipped folder name — adjust to yours
node --version      # should print v18 or higher
```

If `node --version` says "not recognized" / "command not found", install Node.js
from [nodejs.org](https://nodejs.org) (the LTS button), then reopen the terminal.

> **Two ways from here.** Path B (`pnpm vault:setup`) does everything from this
> terminal: database, bucket, tables and the invite-code function, deployed and
> scoped. Path A does the same work by clicking in the Appwrite console, with no
> terminal at all — the only thing Path A cannot avoid is deploying the function
> by hand in Part 4, which is why it takes longer.

---

## Part 2 — Get an API key

The console (a browser) is needed for both paths.

1. Sign in at [cloud.appwrite.io](https://cloud.appwrite.io) and open the
   **Eternalz** project.
2. Left sidebar → **Overview**. Scroll to **Integrations** → **API keys** →
   **Create API key**.
3. Name it something like `eternalz-setup`.
4. Tick these scopes:

   | Scope | Why |
   | --- | --- |
   | **Databases** | create the `eternalz` database |
   | **Tables** | create `vault_groups` and `vault_files` |
   | **Buckets** | create the `vault-docs` bucket |
   | **Files** | set the bucket's file rules |
   | **Functions** | only if your CLI deploys functions |

5. **Create**, then copy the key. Appwrite shows it properly only once.

Treat this key like a password — it can administer the project. Don't paste it
into chat, a screenshot, or a public repository. Delete it when you're done if you
don't plan to re-run setup.

---

## Part 3A — Create the backend in the console (no terminal)

Six things to create. Names matter — they must match exactly, because the app
looks for these names.

### 3A.1 · Database

**Databases → Create database**
- Name: `Eternalz vault`
- **Database ID: `eternalz`** ← must be exactly this

### 3A.2 · Bucket

**Storage → Create bucket**
- **Bucket ID: `vault-docs`**
- Name: `Eternalz documents`
- **Maximum file size: `25`** MB
- **Allowed file extensions** — add exactly:

  ```
  pdf doc docx odt rtf txt md xls xlsx ods csv tsv ppt pptx odp jpg jpeg png webp gif heic heif bmp
  ```

- **File security: ON** ← this is the important one. It is what makes each file's
  own permissions decide who can read it.
- **Encryption: ON**, **Antivirus: ON** (skip either if your plan refuses it)
- **Transformations: ON** ← needed for image thumbnails
- **Permissions** → add a role: **Users** → `create` only.
  (Members can upload; *who can read* is decided per file by the app.)

### 3A.3 · Table `vault_groups`

**Databases → Eternalz vault → Create table**
- **Table ID: `vault_groups`**
- **Row security: ON** (this is what makes the team permission on each row apply)
- **Permissions** → **Users** → `create` only

Add these columns (**Create column → String**, unless noted):

| Column key | Type | Size | Required |
| --- | --- | --- | --- |
| `name` | String | 64 | yes |
| `description` | String | 256 | **no** |
| `teamId` | String | 36 | yes |
| `ownerId` | String | 36 | yes |
| `joinCodeSalt` | String | 64 | yes |
| `joinCodeHash` | String | 64 | yes |
| `joinCodeLookup` | String | 64 | yes |

Then **Indexes → Create index**:
- Key: `join_lookup` · Type: **Key** · Column: `joinCodeLookup` · Order: ASC

### 3A.4 · Table `vault_files`

- **Table ID: `vault_files`**
- **Row security: ON**
- **Permissions** → **Users** → `create` only

| Column key | Type | Size | Required |
| --- | --- | --- | --- |
| `groupId` | String | 36 | yes |
| `name` | String | 255 | yes |
| `bucketFileId` | String | 36 | yes |
| `size` | **Integer** | — | yes |
| `mimeType` | String | 128 | yes |
| `kind` | String | 16 | yes |
| `uploadedBy` | String | 36 | yes |
| `uploadedByName` | String | 64 | yes |

Indexes:
- `group_id` · Key · `groupId`
- `bucket_file_id` · Key · `bucketFileId`

Now go to [Part 4](#part-4--deploy-the-invite-code-function).

---

## Part 3B — Create the backend with one command

In your terminal, from the project folder:

```bash
pnpm install          # once, installs the project's dependencies
pnpm vault:setup      # creates everything, then deploys the join service
```

It creates the database `eternalz`, the bucket `vault-docs`, the tables
`vault_groups` and `vault_files` with their columns and indexes, and then
**deploys `functions/join-group` and activates it** with the three scopes it needs
at runtime (`teams.read`, `teams.write`, `rows.read` — set on the function, which
is why no key has to be pasted into its settings). It finishes by reading
everything back so you can see what exists.

The key needs read and write on **Databases, Tables, Buckets and Functions**.

`pnpm vault:setup` asks you to paste the API key from Part 2 — it is **not
echoed** while you type and is **never written to disk**. Paste, press Enter.

If you'd rather not type the key at all (for example in CI), set the environment
variable instead and it skips the prompt:

```bash
APPWRITE_API_KEY=your-key pnpm vault:setup   # macOS / Linux
$env:APPWRITE_API_KEY="your-key"; pnpm vault:setup   # Windows PowerShell
```

It is safe to run repeatedly: anything that already exists is left alone, so it
will never duplicate or overwrite your data. The function's settings are the one
exception — if they have drifted from what this repo needs, it says what it is
changing and puts them back.

Check the result any time by re-running it — every line reports `✔ created`,
`• already exists`, or what it repaired. The closing list is the same four things
the app's **Setup check** looks at.

Two flags, if you need them: `--redeploy` ships the code currently in
`functions/join-group` even when a deployment is already live (the default is to
leave a working deployment alone, since rebuilding takes about a minute), and
`--skip-deploy` sets up everything except the function's code.

> **If you edited `functions/join-group`,** run `pnpm vault:setup --redeploy` — the
> deployed copy does not update by itself.

### Path B — without running anything on your own computer

If you would rather not run the command locally, the same script runs on GitHub's
runners through the **Appwrite setup** workflow. That is the route used when
setting this project up from a machine that cannot reach
`tor.cloud.appwrite.io` — the Appwrite cloud is not always reachable from every
network, and a CI runner sidesteps that entirely.

1. Appwrite console → **Overview → Integrations → API keys → Create key**, with
   read and write on **Databases, Tables, Buckets and Functions**.
2. On GitHub: **Settings → Secrets and variables → Actions → New repository
   secret**, name **`APPWRITE_API_KEY`**, value = that key. GitHub masks it in
   every log.
3. **Actions → Appwrite setup → Run workflow** (tick *redeploy* to rebuild the join
   service even if a deployment is already live).

The run's summary says what it found and created, and fails with an explanation
if the key is missing, rejected, or short of a scope. The key is used only as an
environment variable; nothing prints it, and you can delete it once the app's
Setup check is green.

The workflow also re-runs on its own when `scripts/setup-appwrite.mjs` or
anything under `functions/join-group/` changes, so the deployed backend cannot
drift from the code in the repository.

---

## Part 4 — Deploy the invite code function

> **Already done if you used Path B.** `pnpm vault:setup` creates this function,
> deploys it and sets its scopes. Skip to [Part 5](#part-5--check-it-worked), unless
> you would rather do it in the console yourself.

This one piece is required for **joining a group**, and it can't be done from the
app: verifying an invite code and adding somebody to a team is a privileged
action, and the whole point of the design is that a client cannot do it.

### Option 1 — paste it into the console (works from anywhere)

1. **Functions → Create function**
2. **Function ID: `join-group`** ← must be exactly this
3. Name: `join-group` · **Runtime: Node.js 18** (or newer) · **Execute access: Any**
4. **Create**
5. Open the function → **Settings → Environment variables**, add:

   | Variable | Value |
   | --- | --- |
   | `APPWRITE_FUNCTION_API_KEY` | a key with **`teams.read`**, **`teams.write`**, **`rows.read`** |

   ⚠️ This key is **not** the same as the setup key — it needs different scopes.
   Create a second key (Overview → API keys) with just those three.
   `VAULT_DATABASE_ID` and `VAULT_GROUPS_TABLE_ID` already default to the right
   values; you only need them if you renamed things.

   **Execute access** should be **Any**. That sounds alarming but isn't: the
   function reads the caller's identity from the `x-appwrite-user-id` header and
   returns **401** when it's missing, so an anonymous request gets nothing. It
   fails closed.

6. Deploy the code. Open the function and use its code editor to paste the entire
   contents of **`functions/join-group/main.js`** as the entrypoint, then
   **Deploy**.
7. **Also add a `package.json`** in the same editor — the function imports the
   Appwrite SDK, so the dependency has to be declared. Paste the contents of
   **`functions/join-group/package.json`**:

   ```json
   {
     "name": "join-group",
     "version": "1.0.0",
     "private": true,
     "main": "main.js",
     "dependencies": { "node-appwrite": "^29.3.1" }
   }
   ```

   Then deploy once more. This is the step people most often miss, and the
   symptom is `Cannot find module 'node-appwrite'` in the function logs.

### Option 2 — deploy from a terminal (needs the Appwrite CLI)

```bash
cd functions/join-group
npm install            # installs node-appwrite for the function
appwrite login
appwrite push function
```

`npm install` works here because the folder now has its own `package.json`
declaring that dependency. If you don't have the CLI, use Option 1.

---

## Part 5 — Install and check everything

### Getting the app onto a phone

The build runs on GitHub's runners (this sandbox has no Android SDK) and publishes the newest APK to a permanent link:

**https://github.com/WaquarShaikh5555/app-appwrite/releases/latest/download/eternalz.apk**

Open that on the phone, let it download, then tap it from **Files → Downloads**. Android asks once to allow installs from that source.

Use this instead of the **Artifacts** download on the Actions page: Artifacts are served as a ZIP, so the file has to be extracted on the phone first, and installing the zip (or a half-extracted copy) gives *"There was a problem parsing the package"*. The APK is ~54 MB; the zip is ~29 MB, so the size tells you which you are holding.

The APK is signed with Android's debug keystore — fine for sideloading and testing, not a Play Store key. It carries **both** signature schemes: the pipeline strips Expo's release signing config so Gradle emits `app-release-unsigned.apk`, then signs it explicitly with `apksigner --v1-signing-enabled true --v2-signing-enabled true` and refuses to publish unless both are verified. Two schemes matter because v2 covers the whole file byte-for-byte (so a single altered byte makes Android refuse it) while v1 signs entries individually and still lets the installer fall back.

One trap worth knowing if you ever check a build by hand: `apksigner verify --verbose` prints `Verified using v1 scheme (JAR signing): false` for *any* APK whose `minSdkVersion` is 24+, because it does not check JAR signing on targets that cannot use it. Pass `--min-sdk-version 23` to make it report the truth.

### Check everything

Open the app → **Tools → Document Manager**.

- If the backend is missing anything, you'll see a card offering **Setup check**.
- Or go straight there: **Document Manager → Setup check**.

It tests the bucket, both tables and the function with **real requests**, and
prints a fix hint next to each failure. Tap **Re-run checks** after fixing
something. When all four rows read **Ready**, you're done.

You should be able to create a group, upload a file, and join from a second
account using the invite code.

---

## If something's wrong

| What you see | What it means |
| --- | --- |
| **Missing** on the bucket or a table | The ID doesn't match. It must be exactly `vault-docs`, `vault_groups`, `vault_files` — check for typos and stray spaces. |
| **Check permissions** on a table | Row security (or the Users→`create` permission) isn't enabled on that table. |
| **Missing** on the function | The function ID isn't `join-group`, or it was created without **Execute access: Any**. `pnpm vault:setup` fixes both. |
| Setup check says the function failed | Open **Functions → join-group → Logs**. If the deployment never finished building, re-run `pnpm vault:setup --redeploy` — the build output is printed for you when a build fails. |
| `Cannot find module 'node-appwrite'` in the logs | The deployed package is missing its dependency. `pnpm vault:setup --redeploy` repackages `functions/join-group` with its `package.json` and builds it with `npm install`.
| Setup says the key was rejected (401) or is missing a permission (403) | The key needs read and write on Databases, Tables, Buckets **and Functions** — `functions.write` is what creates and deploys the join service. |
| **401 / Unauthorized** when opening a file | Working as intended for a non-member. If you *are* a member, your membership was removed or the file's permissions were altered by hand. |
| An invite code isn't accepted | Codes are shown once at creation and stored only as a hash — they can't be recovered. Open the group and **Rotate invite code** to get a fresh one. |
| `pnpm: command not found` | Use `npm run vault:setup` instead — same thing. |

For how the security works, what is and isn't protected, and the deliberate
omission of PDF-to-image, see [VAULT.md](VAULT.md).
