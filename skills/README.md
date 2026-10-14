# Vendored Appwrite Agent Skills

Upstream: <https://github.com/appwrite/skills> (also published as `appwrite/agent-skills`)
Pinned commit: `a062e60a3e4d63b29002066c2f4b3e05ef6dcc44` (2026-08-18, upstream skills version 0.3.0)
Target: Appwrite server 1.9.x
License: BSD-3-Clause, © Appwrite — see [`LICENSE`](LICENSE)

These follow the Agent Skills open standard (<https://agentskills.io/home>): each skill is a folder with a `SKILL.md` containing YAML frontmatter (`name`, `description`) plus instructions. Agents that support the standard discover them natively; other agents just read the files.

Vendored into this repo so that any agent touching this project has the Appwrite context locally, with no network fetch required.

## Included

- `appwrite-cli/` — CLI workflow: when to use `appwrite.config.json` vs one-off `appwrite client` calls, auth vs project selection, `pull`/`push`, `appwrite generate`, functions/sites, query flags.
- `appwrite-typescript/` — TypeScript SDK: web (`appwrite`), React Native (`react-native-appwrite`), server (`node-appwrite`). Auth (email, OAuth, anonymous), TablesDB queries, storage, realtime, SSR, permissions.

Not vendored (add if the stack changes): `appwrite-python`, `appwrite-dart`, `appwrite-kotlin`, `appwrite-swift`, `appwrite-php`, `appwrite-ruby`, `appwrite-go`, `appwrite-dotnet`, `appwrite-rust`.

## Updating

```bash
git clone --depth 1 https://github.com/appwrite/skills /tmp/appwrite-skills
cp -r /tmp/appwrite-skills/skills/appwrite-cli /tmp/appwrite-skills/skills/appwrite-typescript skills/
cp /tmp/appwrite-skills/LICENSE skills/LICENSE
# then update the pinned commit and version above

# or, if you prefer the skills CLI:
npx skills add appwrite/agent-skills
```

Keep files byte-identical to upstream so diffs on the next update stay clean.
