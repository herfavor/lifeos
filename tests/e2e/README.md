# Hosted browser-test suite

LifeOS keeps browser-test source in this directory and executes the full browser matrix only through the manual **Hosted browser tests** GitHub Actions workflow on GitHub-hosted Linux.

## Execution boundary

- Trigger `.github/workflows/browser-tests.yml` manually from GitHub Actions.
- Tests build LifeOS and serve a task-owned production preview on `127.0.0.1:4173`.
- Browser contexts must use synthetic test data only.
- Never add credentials, authenticated profiles, cookies, tokens, private backups, or production data.
- Failure reports, screenshots, videos, and traces are short-lived workflow artifacts and must not be committed.
- The checked-in `npm run test:e2e` command is intentionally guarded and must not be bypassed locally.

## Static checks

`npm run test:browser:inventory` performs a non-browser inventory of spec files, exclusive tests, skips/fixmes, and required critical suites.

The normal PR CI also runs the inventory check. Full browser execution remains a separate hosted workflow.

## Hosted project matrix

| Hosted lane | Projects |
| --- | --- |
| Chromium | `chromium`, `mobile-chrome` |
| Firefox | `firefox` |
| WebKit | `webkit`, `mobile-safari` |

Each project uses isolated synthetic state and a task-owned preview.

## Critical suites

| File | Intended protection |
| --- | --- |
| `data-persistence.spec.ts` | IndexedDB persistence and reload/tab lifecycle |
| `persistence-flows.spec.ts` | Task, note, settings, and cross-page persistence |
| `backup-restore.spec.ts` | `.brain` export/import integrity and migration cases |
| `automation-engine.spec.ts` | Execution ordering, conditions, and loop prevention |
| `automation-rules.spec.ts` | Rule lifecycle, triggers, and history |
| `cross-feature-integration.spec.ts` | Cross-domain integration behavior |
| `accessibility.spec.ts` | Landmarks, semantics, keyboard focus, and modal focus |
| `responsive.spec.ts` | Mobile, tablet, and desktop behavior |
| `visual-style-smoke.spec.ts` | Theme/CSS rendering smoke checks; not screenshot regression |
| `performance.spec.ts` | Load, navigation, request-count, and idle-error thresholds |

## Test expectations

Tests should:

1. use deterministic synthetic data;
2. isolate or explicitly seed IndexedDB/local storage;
3. prefer semantic selectors;
4. wait on observable state instead of fixed sleeps;
5. assert durable behavior rather than merely completing interactions;
6. avoid external network dependencies unless the test explicitly owns them.

Shared factories and IndexedDB helpers live in `tests/fixtures/test-data.ts`; custom browser-state fixtures live in `tests/fixtures/test-utils.ts`.

## Failure evidence

Workflow artifacts may contain rendered test data and traces. Treat them as diagnostic artifacts, do not publish them as product assets, and do not copy them into the repository.
