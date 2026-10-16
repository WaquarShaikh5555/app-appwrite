# Eternalz

A dark, cosmic personal toolkit for everyday things — built with Expo / React Native on top of [Appwrite](https://appwrite.io).

Created by **Waquar Shaikh**.

<p align="center">
  <img src="assets/images/icon.png" width="140" alt="Eternalz" />
</p>

## What's in it today

- **First-run tour** — four quick screens on first launch: what Eternalz is, who built it, the tools that are on the way, and where to find everything.
- **Dashboard (Home)** — brand masthead, live connection chip, stats, the featured roadmap, and your account state.
- **Document Manager** — the first live tool. Private, invite-only file rooms for families and small teams: store PDFs, photos, spreadsheets and documents, with on-device photo and PDF tools. [How it works](docs/VAULT.md) · [Setup guide](docs/SETUP.md).
- **Tools** — the full roadmap; live tools open when tapped, the rest show what they'll do. New tools appear here as they ship.
- **Settings** — your account, an **Appwrite connection test**, the roadmap count, and About.
- **Accounts** — sign up, log in, log out, persisted sessions, account details. Powered by Appwrite's Account service.

Everything is built to grow: the roadmap lives in one file, so adding a tool is a one-line change.

## Appwrite project

| | |
|---|---|
| Project name | Eternalz |
| Project ID | `6acf0e9b0034e6ac2483` |
| Endpoint | `https://tor.cloud.appwrite.io/v1` (Toronto region) |

These are baked into [`constants/appwrite.ts`](constants/appwrite.ts) so the app runs with no `.env` file; `EXPO_PUBLIC_APPWRITE_*` env vars override if you ever need them.

## Quick start

```bash
pnpm install
pnpm web        # browser
pnpm android    # Android device/emulator (needs adb + Expo Go)
pnpm ios        # iOS (macOS only)
```

Settings → **Test connection** pings Appwrite and shows the round-trip time, so you can confirm the project is wired correctly.

### Install the app on a phone (APK)

**Download, then tap it on your phone:**

**→ https://github.com/WaquarShaikh5555/app-appwrite/releases/latest/download/eternalz.apk**

That URL always serves the newest build and downloads a real `.apk` — about 54 MB.

Use that link rather than the **Artifacts** download on the Actions page. Artifacts are always served as a **ZIP**, so you have to extract it on the phone first; every step between the download and the installer is a chance to end up installing something that is not the APK, which Android reports as *"There was a problem parsing the package"*. (The giveaway: the ZIP is ~29 MB while the actual APK is ~54 MB. If the file you are tapping is 29 MB, it is the zip.)

Then:

1. Open the link **on the phone** and let it finish downloading.
2. Open **Files → Downloads** and tap `eternalz.apk`.
3. Android asks once to allow installs from that source — allow it, then install.

Every build prints the APK's `sha256` and, using Android's own `aapt2` and `apksigner`, confirms the manifest parses and which signature schemes are present — visible in the run's summary annotations. It is annotated with `--min-sdk-version 23` on purpose: at `minSdkVersion` 24 and above `apksigner` skips the JAR-signature check entirely and reports v1 as *false* even when the signature is there, which makes a correctly signed APK look v2-only.

Two things worth knowing:

- The APK is signed with Android's **debug keystore**, which Expo's template wires up for release builds. Android accepts it for sideloading, so it installs and runs normally — but it is not a Play Store key, and a future build has to use the same key to upgrade over an existing installation.
- The Document Manager needs its backend provisioned first ([docs/SETUP.md](docs/SETUP.md)), otherwise it opens and reports what is missing. Everything else — the tour, the dashboard, accounts, the tools list — works immediately.

The build is defined in [`.github/workflows/android-apk.yml`](.github/workflows/android-apk.yml): it runs `expo prebuild` (so `android/` stays untracked and `app.json` remains the source of truth), builds two ABIs, signs with both APK Signature Scheme v1 and v2 for sideloading resilience, and refuses to publish an artifact unless it is genuinely signed with a manifest, dex and arm64 native code — see [`scripts/verify-apk.mjs`](scripts/verify-apk.mjs).

### Document Manager backend

The file rooms need a bucket, two tables and one function before they'll work. One command creates all of it — database, bucket, tables, columns, indexes — and then packages, deploys and activates the invite-code function with the scopes it needs:

```bash
pnpm vault:setup    # creates and deploys everything; asks for an API key (never saved to disk)
pnpm vault:test     # 119 offline checks, no backend and no network needed
```

The key needs read and write on Databases, Tables, Buckets and Functions. It is used once and not written anywhere. Re-running is safe: existing resources are left alone, and a live deployment is not rebuilt unless you pass `--redeploy`.

…or create the resources by hand in the Appwrite console, no terminal at all — or let GitHub do it for you through the **Appwrite setup** workflow, which runs the same script on a runner with the API key held as a repository secret. Both routes are covered step by step in **[docs/SETUP.md](docs/SETUP.md)**; it also includes where commands actually run, which is not inside Appwrite. Then open **Tools → Document Manager → Setup check** in the app to verify the backend.

> **Running on web?** The browser enforces CORS. If the connection test fails there, add a **Web platform** in the Appwrite console (Project → Platforms) for the host you're serving from. Android and iOS have no such rule.

## Verify without a device

```bash
npx tsc --noEmit   # typecheck
pnpm build         # web export — proves the app bundles
```

## Design language

Near-black void (`#07060D`) with electric violet (`#8B5CF6`) and lavender (`#C4B5FD`) accents. Glass panels over a slowly breathing gradient backdrop, gradient-ringed hero cards, staggered mount animations, and hand-drawn SVG icons (no icon font). The brand mark is vector, so it stays crisp at every size and sits on any background. Tokens live in [`theme/tokens.ts`](theme/tokens.ts).

## Layout

```
app/(tabs)/          Home, Tools, Settings
app/                 onboarding, login, signup, account, about
components/ui/       GlassCard, Button, Chip, TextField, Screen, ListRow, GlowBackground
components/          BrandMark, icons
context/             auth (Appwrite sessions), onboarding (first-run flag)
constants/           appwrite client + roadmap data + vault ids
services/vault/      Document Manager: groups, files, crypto, PDF + photo tools
components/vault/    FileCard, GroupCard
app/documents/       Document Manager screens
functions/join-group Appwrite Function: verifies invite codes server-side
scripts/             setup-appwrite.mjs, test-vault-logic.mjs
docs/                SETUP.md, VAULT.md
theme/               design tokens
skills/              vendored Appwrite agent skills
```

## Credits

Built with [Appwrite](https://appwrite.io), [Expo](https://expo.dev) and React Native. Agent context and conventions live in [AGENTS.md](AGENTS.md).
