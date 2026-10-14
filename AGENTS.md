# AGENTS.md

Project context for this repo. Read this first — it tells you which skill to load, what the conventions are, and what this sandbox can and cannot do.

## Project

An Expo / React Native app (Appwrite's `starter-for-react-native` shape) wired to the **Eternalz** Appwrite project. The home screen is a demo that pings Appwrite and logs the response.

| | |
|---|---|
| Appwrite project name | `Eternalz` |
| Appwrite project ID | `6acf0e9b0034e6ac2483` |
| Appwrite endpoint | `https://tor.cloud.appwrite.io/v1` (Toronto / `tor` region) |
| Kit origin | `appwrite/starter-for-react-native` @ `8430139` (2025-12-13) |

Project ID and endpoint are **baked into `constants/appwrite.ts`** (with `EXPO_PUBLIC_*` overrides) so nothing depends on a `.env` file existing. They are not secrets.

```
app/                   expo-router routes — index.tsx holds the ping demo (doPing → client.ping())
constants/appwrite.ts  single source of truth: endpoint, project ID, name, shared `client`
components/            Header (the "Send a ping" button), Logs (project meta + request table)
assets/ styles/ types/
skills/                vendored Appwrite agent skills
```

### Commands

```bash
pnpm install
pnpm web | pnpm android | pnpm ios   # dev servers
pnpm build                            # web export (verifies the app bundles)
npx tsc --noEmit                      # typecheck — keep this green
pnpm lint
```

## Skills — read before doing Appwrite work

- **`skills/appwrite-typescript/SKILL.md`** — SDK usage: client setup, auth (email/OAuth/anonymous), TablesDB queries, storage, realtime, SSR auth, teams, permissions. Read before writing Appwrite code.
- **`skills/appwrite-cli/SKILL.md`** — CLI workflow: `appwrite.config.json` vs one-off `appwrite client` calls, auth vs project selection, `pull`/`push`, `appwrite generate`, function/site variables. Read before running `appwrite`.

Vendored from <https://github.com/appwrite/skills> (pinned commit in [`skills/README.md`](skills/README.md)). Keep those files byte-identical to upstream — upstream fixes rather than editing in place.

## Conventions

- **Client:** import `client` from `@/constants/appwrite`. Never construct a second `Client`.
- **SDK:** `Client` comes from `appwrite` (v21), which serves both web and React Native in this Expo app. `react-native-appwrite` is still in `package.json` from the starter but is **unused** — don't add imports from it without switching the whole client over.
- **Naming:** current Appwrite is **TablesDB** (`tables`/`rows`), not legacy Databases (`collections`/`documents`).
- **Endpoints:** regional hosts (`https://<REGION>.cloud.appwrite.io/v1`), not bare `cloud.appwrite.io`.
- **Secrets:** project ID + endpoint are fine in the client. **API keys are not** — server-side only, via env vars, never committed, never imported into `app/`.
- **Verify before claiming done:** `npx tsc --noEmit` and, if web is touched, `pnpm build`.

## Environment limits (agent sandbox)

Network egress is limited to `github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`. Consequences:

- **No mobile runs.** `adb`, `emulator`, `java`, `xcrun` are all absent → `pnpm android` / `pnpm ios` cannot run in the sandbox. Only the user can do those.
- **Appwrite is unreachable.** `cloud.appwrite.io` and `tor.cloud.appwrite.io` are blocked → no live ping, no CLI login/pull/push, no project provisioning from the sandbox.
- **Expo's version API is blocked** (`api.expo.dev`), and `expo start` dies with `TypeError: fetch failed` without offline mode. Always start the dev server as:

  ```bash
  EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 pnpm exec expo start --web --host lan --port 8081
  ```

  `--host lan` binds `0.0.0.0` so the sandbox live preview works. Metro accepts the proxied `Host` header.

**So:** the sandbox can install deps, typecheck, bundle, and serve the app; it cannot run a device build or reach a live Appwrite. Web previews reach Appwrite from the *user's* browser, which is a real end-to-end check — but say so explicitly instead of implying the sandbox pinged the server.

## Known issues

1. **pnpm phantom dependencies.** `@babel/runtime` (Metro's Babel transform injects it) and `query-string` (expo-router's SSR build requires it) are declared explicitly in `package.json`. npm's flat `node_modules` used to leak both to the root; pnpm's isolated layout does not, so `pnpm build` and the web dev server fail without them. Keep them, and pin `@babel/runtime` to `^7.x` — v8 mismatches this Babel 7 / Expo SDK 52 toolchain.
2. **`.npmrc` `node-linker` is ignored by pnpm 12** (the setting isn't honoured; the layout stays isolated). Fixing the phantom deps above was the working alternative — don't add an `.npmrc` that pretends otherwise.
3. **`app.json` references assets that don't exist:** `assets/images/icon.png` and `assets/images/adaptive-icon.png`. Harmless for `expo start`, but `expo prebuild` / EAS builds will fail until they're supplied or remapped to real files.
