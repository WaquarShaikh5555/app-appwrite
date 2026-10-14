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

Both end at [Part 4](#part-4--deploy-the-invite-code-function), which is the same
either way.

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

> **Skip all of this if you want Path A.** You can do the whole setup by clicking
> in the Appwrite console and never open a terminal — except the **`cd` into the
> project folder** in Part 4, which is unavoidable when deploying the function
> that checks invite codes. Nothing else in this guide needs a terminal.

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
pnpm vault:setup      # creates the database, bucket, tables and indexes
```

`pnpm vault:setup` asks you to paste the API key from Part 2 — it is **not
echoed** while you type and is **never written to disk**. Paste, press Enter.

If you'd rather not type the key at all (for example in CI), set the environment
variable instead and it skips the prompt:

```bash
APPWRITE_API_KEY=your-key pnpm vault:setup   # macOS / Linux
$env:APPWRITE_API_KEY="your-key"; pnpm vault:setup   # Windows PowerShell
```

It is safe to run repeatedly: anything that already exists is left alone, so it
will never duplicate or overwrite your data.

Check the result any time by re-running it — every line reports either
`✔ created` or `• already exists`.

---

## Part 4 — Deploy the invite code function

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

## Part 5 — Check everything

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
| **Missing** on the function | The function ID isn't `join-group`, or it was created without **Execute access: Any**. |
| Setup check says the function failed | Open **Functions → join-group → Logs**. The usual cause is the environment variable or the missing `node-appwrite` dependency (Part 4, step 7). |
| `Cannot find module 'node-appwrite'` in the logs | Part 4 step 7 — add the dependency in the console, or run `npm install` in `functions/join-group` before pushing. |
| **401 / Unauthorized** when opening a file | Working as intended for a non-member. If you *are* a member, your membership was removed or the file's permissions were altered by hand. |
| An invite code isn't accepted | Codes are shown once at creation and stored only as a hash — they can't be recovered. Open the group and **Rotate invite code** to get a fresh one. |
| `pnpm: command not found` | Use `npm run vault:setup` instead — same thing. |

For how the security works, what is and isn't protected, and the deliberate
omission of PDF-to-image, see [VAULT.md](VAULT.md).
