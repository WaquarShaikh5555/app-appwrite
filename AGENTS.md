# AGENTS.md

Project context for this repo. Read this first — it tells you which skill to load and what the conventions are.

## Project

`app-appwrite` — an Appwrite-backed TypeScript app.

> **TODO (fill in as the project takes shape):** what it does, entry points, folder layout, dev/build/test commands, and the Appwrite project ID / region it targets. Right now the repo carries context and skills only — no application code is scaffolded yet.

## Skills — read before doing Appwrite work

- **`skills/appwrite-typescript/SKILL.md`** — TypeScript SDK across web, React Native, and Node. Client setup, auth (email/password, OAuth, anonymous), TablesDB queries, storage, realtime subscriptions, SSR auth, teams, error handling, permissions. Read this before writing any Appwrite client or server code.
- **`skills/appwrite-cli/SKILL.md`** — CLI workflow. When to use `appwrite.config.json` vs a one-off `appwrite client` call, separating auth from project selection, `pull`/`push` semantics, `appwrite generate` for type-safe code, function/site variables, query flags, CI keys. Read this before running `appwrite` or editing `appwrite.config.json`.

Vendored from <https://github.com/appwrite/skills> (pinned commit in [`skills/README.md`](skills/README.md), which also documents how to update them). Files there are kept byte-identical to upstream — don't edit them in place; upstream the change instead.

## Conventions

- **Appwrite version:** server 1.9.x. Use current naming — **TablesDB** (`tables` / `rows`), not the legacy Databases (`collections` / `documents`).
- **SDK selection:** `appwrite` for web, `react-native-appwrite` for React Native, `node-appwrite` for server/Node. API keys are server-only — never pass one to a browser client.
- **Endpoint:** `https://<REGION>.cloud.appwrite.io/v1` (regional hosts, not bare `cloud.appwrite.io`). Read it from env alongside the project ID.
- **Config:** secrets come from env vars — `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`. Commit a `.env.example`; never commit `.env`, keys, or secrets. Keep the API key out of `appwrite.config.json`.
- **Project state lives in the repo:** schema and functions belong in a committed `appwrite.config.json`, synced with `pull`/`push`. Don't provision resources through ad-hoc CLI calls that leave no trace for the next clone.
- **Scripting:** pass `--json` to any CLI command whose output gets parsed.

## Environment limits (agent sandboxes)

Network egress is restricted to `github.com`, `codeload.github.com`, `api.github.com`, `registry.npmjs.org`, `pypi.org`, and `files.pythonhosted.org`. Verified in the current sandbox: **`cloud.appwrite.io` is unreachable and Docker is not available.**

- ✅ Install packages from npm/PyPI, write and typecheck SDK code, run unit tests against mocks, hand-edit `appwrite.config.json`
- ❌ `appwrite login`, `init project`, `pull`/`push`, creating tables/functions, or deploying anything against a live project

Write Appwrite code so it is testable without a backend (inject or mock the client), and when a step genuinely requires a live project, say so explicitly instead of silently skipping it.

## Verification

Before claiming a task is done: typecheck (`npx tsc --noEmit` once a `tsconfig.json` exists), and run whatever lint/test setup is configured. State plainly what could not be verified locally.
