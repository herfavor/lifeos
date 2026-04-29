# AGENTS.md — Provider-Agnostic Agent Instructions

<!-- phase-5-provider-agnostic-baseline -->

Last updated: 2026-04-29

## Project overview

NeumanOS is a privacy-first, local-only productivity app built with React, TypeScript, Vite, IndexedDB/local storage, Vitest, and Playwright.

## Operating rules for AI agents

- Read before editing: inspect README.md, package.json, docs/config, and nearby source before making changes.
- Preserve existing documentation. Do not delete docs; update or append when behavior changes.
- Do not modify CLAUDE.md files if one is added later.
- Prefer compatibility-first changes. Avoid breaking data storage, import/export behavior, public routes, or documented workflows unless explicitly requested.
- Do not commit, push, deploy, rotate secrets, or run destructive commands unless explicitly asked in the current session.

## Documentation expectations

- Update README/docs when commands, user-visible behavior, data contracts, environment variables, or operational procedures change.
- Include or update tests for code changes when the documented test toolchain applies.

## Build, test, and local commands

Only run commands supported by checked-in docs/config. Confidently discovered commands:

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run build:production`
- `npm run lint`
- `npm test`
- `npm run test:coverage`
- `npm run test:e2e`
- `npm run test:e2e:chromium`
- `npm run type-check`
- `npm run audit`
- `npm run ci`

## Compatibility and safety constraints

- Local-first privacy is a core constraint: do not add server dependency, account requirement, or cloud sync without explicit approval.
- Preserve IndexedDB/local-storage data compatibility, `.brain` backup/restore behavior, and export/import paths.
- Treat API-provider keys as local user secrets. Never print, commit, or invent credentials, tokens, cookies, private keys, OAuth secrets, API keys, personal data, or production-only configuration. Use placeholders in docs/examples.
