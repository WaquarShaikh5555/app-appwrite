# AGENTS.md

Project context for this repo. Read this first — it tells you which skill to load, the design system, and what this sandbox can and cannot do.

## Project

**Eternalz** — a dark, cosmic personal-toolkit app on Expo / React Native, backed by the Eternalz Appwrite project. Originally bootstrapped from Appwrite's `starter-for-react-native`; the starter's bright demo UI has since been fully replaced.

| | |
|---|---|
| Appwrite project name | `Eternalz` |
| Appwrite project ID | `6acf0e9b0034e6ac2483` |
| Appwrite endpoint | `https://tor.cloud.appwrite.io/v1` (Toronto / `tor` region) |
| App version | `0.1.0` |
| Created by | Waquar Shaikh |

### Routes

```
app/_layout.tsx          providers, fonts, ambient backdrop, StatusBar
app/(tabs)/_layout.tsx   bottom tab bar (blur on native, solid on web)
app/(tabs)/index.tsx     Home — masthead, hero, stats, roadmap, account, footer
app/(tabs)/tools.tsx     Tools — roadmap grid, tap a card for details
app/(tabs)/settings.tsx  Settings — account, connection test, roadmap, app/about
app/onboarding.tsx       First-run tour (4 slides, paged) — shown before Home
app/login.tsx            Log in
app/signup.tsx           Create account
app/account.tsx          Account details
app/about.tsx            Version, credits, links, replay tour
```

First launch shows `/onboarding`; the "seen" flag lives in AsyncStorage
(`eternalz:onboarding:v1`) via `context/onboarding.tsx`. Settings → **Replay the
intro tour** clears it.

### Commands

```bash
pnpm install
pnpm web | pnpm android | pnpm ios   # dev servers
pnpm build                            # web export (verifies the app bundles)
npx tsc --noEmit                      # typecheck — keep this green
pnpm lint
```

> `pnpm` may not be on PATH in a fresh sandbox shell — `corepack pnpm <cmd>` always works.

## Design system

Everything is tokenised in `theme/tokens.ts` — **never hardcode a colour, radius or font in a screen.**

- **Palette:** near-black void `#07060D`, raised `#0D0B18`, violet primary `#8B5CF6`, lavender accent `#C4B5FD`. All surfaces are dark; accents glow via `glow.primary` / `glow.soft`.
- **Surfaces:** `components/ui/GlassCard.tsx` — translucent panel over the backdrop; `emphasis` adds a gradient ring for hero content.
- **Type:** Poppins (display/headings) + Inter (body), exposed as `type.display / h1 / h2 / title / body / bodyStrong / caption / overline`. Always pair `fontSize` with `lineHeight` — RN has no inherited line height.
- **Backdrop:** `components/ui/GlowBackground.tsx` — vertical void gradient plus two slow-breathing violet orbs. Rendered once in the root layout; it stays decorative (`pointerEvents="none"`).
- **Icons:** `components/icons.tsx` — hand-drawn 24px SVG set, no icon font. Add new ones there.
- **Brand mark:** `components/BrandMark.tsx` — vector "E" monogram with orbital ring and spark. Vector on purpose: crisp at any size, sits on any background.
- **Motion:** `hooks/useEntrance.ts` (`useEntrance` stagger, `usePulse` ambience) built on the core `Animated` API — **no babel plugin, no Reanimated**, and `useNativeDriver` is disabled on web where the native driver is unavailable. `react-native-reanimated` is still installed (starter leftover) but unused for animation.
- **Layout:** screens constrain content to `maxWidth: 560` (720 on Tools) and centre it, so web and tablet don't stretch.

## Brand assets

| File | Use |
|---|---|
| `assets/images/icon.png` | App icon (1024², dark rounded plate) |
| `assets/images/adaptive-icon.png` | Android adaptive icon |
| `assets/images/favicon.png` | Web favicon (64²) |
| `assets/branding/icon-source.png` | Original 1024² artwork the three above are derived from |

The icons were produced by cropping the artwork's rounded plate, refilling the corners with brand black `#07060D`, and re-applying a measured corner radius (fitted 173px on the source, rms 1.4). Regenerate rather than hand-editing the PNGs.

## Skills — read before doing Appwrite work

- **`skills/appwrite-typescript/SKILL.md`** — SDK usage: client setup, auth (email/OAuth/anonymous), TablesDB queries, storage, realtime, SSR auth, teams, permissions.
- **`skills/appwrite-cli/SKILL.md`** — CLI workflow: `appwrite.config.json` vs one-off `appwrite client`, `pull`/`push`, `appwrite generate`, function/site variables.

Vendored from <https://github.com/appwrite/skills> (pinned commit in [`skills/README.md`](skills/README.md)). Keep byte-identical to upstream — upstream fixes rather than editing in place.

## Conventions

- **Client:** import `client` / `account` from `@/constants/appwrite`. Never construct a second `Client` — sessions live per client instance.
- **Auth:** use `useAuth()` from `context/auth.tsx`. `signUp` calls `account.create()` **then** `createEmailPasswordSession()`, because `create()` does not open a session in SDK 21 (verified against the installed SDK's docs).
- **SDK naming:** current Appwrite is **TablesDB** (`tables`/`rows`), not legacy Databases (`collections`/`documents`).
- **Endpoints:** regional hosts (`https://<REGION>.cloud.appwrite.io/v1`), never bare `cloud.appwrite.io`.
- **Secrets:** project ID + endpoint are fine in the client and are baked into `constants/appwrite.ts` (with `EXPO_PUBLIC_*` overrides). **API keys are not** — server-side only, never committed, never imported into `app/`.
- **Roadmap data:** `constants/roadmap.tsx` is the single source of truth for tools — Home features three of them, Tools and Settings read the same list. Add a tool once, in that file.
- **Verify before claiming done:** `npx tsc --noEmit`, plus `pnpm build` when routes or assets change.

## Environment limits (agent sandbox)

Network egress is limited to `github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, `files.pythonhosted.org`. Consequences:

- **No mobile runs.** `adb`, `emulator`, `java`, `xcrun` are all absent → `pnpm android` / `pnpm ios` cannot run here. Only the user can do those.
- **Appwrite is unreachable.** `cloud.appwrite.io` and `tor.cloud.appwrite.io` are blocked → no live ping, no CLI login/pull/push, no provisioning from the sandbox. The in-app connection test must be run by the user.
- **Expo's version API is blocked** (`api.expo.dev`). `expo start` dies with `TypeError: fetch failed` without offline mode. Always start the dev server as:

  ```bash
  EXPO_NO_TELEMETRY=1 EXPO_OFFLINE=1 corepack pnpm exec expo start --web --host lan --port 8081
  ```

  `--host lan` binds `0.0.0.0` so the sandbox live preview works. Metro accepts the proxied `Host` header.

**So:** the sandbox can install deps, typecheck, bundle, and serve the app; it cannot run a device build or reach a live Appwrite. Web previews reach Appwrite from the *user's* browser, which is a real end-to-end check — say so explicitly instead of implying the sandbox pinged the server.

## Known issues

1. **pnpm phantom dependencies.** `@babel/runtime` (Metro's Babel transform injects it), `query-string` (expo-router's SSR build requires it) and `@types/node` (needed because `expo/types` starts with `/// <reference types="node" />`) are declared explicitly in `package.json`. npm's flat `node_modules` used to leak all three to the root; pnpm's isolated layout does not, so `pnpm build`, the web dev server, or `tsc` fails without them. Keep them, and pin `@babel/runtime` to `^7.x` — v8 mismatches this Babel 7 / Expo SDK 52 toolchain.
2. **`.npmrc` `node-linker` is ignored by pnpm 12** (the setting isn't honoured; the layout stays isolated). Declaring the phantom deps above is the working fix — don't add an `.npmrc` that pretends otherwise.
3. **`expo-env.d.ts` is generated, not committed** (Expo writes it on dev-server start). Don't rely on it for typechecking; that's why `@types/node` is a real dependency here.
4. **SSR logs a `useLayoutEffect does nothing on the server` error** from `@react-navigation/elements`. It originates inside React Navigation during static web rendering — nothing in this repo uses `useLayoutEffect` (`grep` to confirm). Dev-only noise; the page renders and hydrates correctly. Don't chase it. Related: if you add `shadow*` / `textShadow*` styles, import `glow` from the theme or gate them with `Platform.select` — React Native Web deprecates them for `boxShadow` / `textShadow` and will warn.
