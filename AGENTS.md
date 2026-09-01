# AGENTS.md — LifeOS agent instructions

LifeOS is a local-first Web/PWA personal workspace built with React, TypeScript, Vite, Zustand, IndexedDB/local storage, Vitest, and hosted Playwright tests.

## Before editing

- Read nearby source, tests, `README.md`, `CONTRIBUTING.md`, and relevant config before changing behavior.
- Reuse the existing domain store/service/component before creating another implementation.
- Prefer the smallest change that satisfies the requested behavior.
- Preserve local-first privacy, backup/restore behavior, persisted data compatibility, and public routes unless a migration is explicitly part of the task.

## Repository hygiene

- Do not create audit, implementation, progress, phase, handoff, completion, status, or planning Markdown files as task artifacts.
- Use GitHub Issues/PR descriptions for temporary plans, investigations, checklists, and completion notes.
- Update canonical documentation in place; delete obsolete documentation instead of creating `archive` folders.
- Final source code must not contain implementation chronology such as `Phase N`, `Wave N`, `P0/P1/P2`, parity percentages, or “final polish” notes. Comments should explain domain intent or non-obvious constraints.
- Do not preserve dead code or hidden duplicate implementations by default. Keep compatibility shims only when existing user data or a documented migration requires them.
- Do not add a second source of truth for an existing domain concept. Shared concepts such as timers, tasks, notes, and projects must use their canonical store/service.
- Do not broaden product scope as part of an unrelated task.

## Development workflow

- Use a short-lived branch and Pull Request for repository changes unless the user explicitly requests another workflow.
- Keep each PR focused on one concern and document why it exists, what changed, and how it was verified.
- Do not push directly to `main` unless explicitly requested.
- Do not commit secrets, credentials, tokens, cookies, private keys, personal data, or production-only configuration.

## Verification

Run the repository verification gate:

```bash
npm run ci
```

This includes lint warning budget, repository hygiene, source-size and documentation-link checks, TypeScript, unit tests, design tokens, browser-test inventory, production build, and a blocking high-severity production dependency audit.

Full Playwright browser tests run only through the repository's hosted GitHub Actions workflow. Do not point browser tests at production data or real accounts.

## Architecture and data constraints

- Zustand is the business-state source of truth; UI widgets must not reimplement the same state machine locally.
- Dexie / IndexedDB and local storage are primary persistence layers.
- Zod belongs at I/O and AI-tool boundaries.
- AI executors must call domain stores/services rather than duplicate business rules.
- Provider API keys are local user secrets.
- Legacy persisted identifiers documented in `docs/technical/PERSISTENCE_COMPATIBILITY.md` must not be renamed without an explicit backward-compatible migration.
