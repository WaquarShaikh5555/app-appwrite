# app-appwrite — Eternalz

Expo / React Native app built on the [Appwrite React Native starter kit](https://github.com/appwrite/starter-for-react-native), with the **Eternalz** Appwrite project wired in.

Agent context lives in [AGENTS.md](AGENTS.md); Appwrite skills are vendored in [`skills/`](skills/).

## Appwrite project

| | |
|---|---|
| Project name | Eternalz |
| Project ID | `6acf0e9b0034e6ac2483` |
| Endpoint | `https://tor.cloud.appwrite.io/v1` (Toronto region) |

These are baked into [`constants/appwrite.ts`](constants/appwrite.ts) so the app runs with no `.env` file. Setting `EXPO_PUBLIC_APPWRITE_ENDPOINT` / `_PROJECT_ID` / `_PROJECT_NAME` overrides them.

## Quick start

```bash
pnpm install
pnpm web        # browser
pnpm android    # Android device/emulator (needs adb + Expo Go)
pnpm ios        # iOS (macOS only)
```

Then press **Send a ping** on the home screen. It calls `client.ping()` against `/v1/ping`; the result appears in the **Logs** sheet at the bottom, which also shows the endpoint, project ID and project name in use.

> **Browser ping note:** on web the request comes from your browser, so Appwrite must allow that origin — add a **Web platform** in the Appwrite console (Project → Platforms) matching the URL you're running from. On Android/iOS there is no CORS, so the ping works without platform config.

## Verify setup without a device

```bash
npx tsc --noEmit          # typecheck
pnpm build                # web export — proves the app bundles
curl -H "X-Appwrite-Project: 6acf0e9b0034e6ac2483" https://tor.cloud.appwrite.io/v1/ping
```

## Layout

```
app/                 expo-router routes (index.tsx = home + ping demo)
constants/appwrite.ts  endpoint, project ID, name, shared Appwrite client
components/          UI: Header (ping button), Logs (project meta + request log)
assets/ styles/ types/
skills/              vendored Appwrite agent skills
```

## Notes for pnpm users

`@babel/runtime` and `query-string` are declared explicitly in `package.json` even though only transitive packages reference them: pnpm's isolated `node_modules` doesn't hoist them to the root, and Metro's Babel transform / expo-router's SSR build resolve them from there. Removing either breaks `pnpm build` and the web dev server.
