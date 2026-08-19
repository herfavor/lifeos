# Hosted browser-test suite

NeumanOS keeps its browser-test source in this directory, but executes it only through the repository's manual **Hosted browser tests** GitHub Actions workflow on GitHub-hosted Linux. TJNMPM is not a browser-test runner and must not install or launch Playwright, Chromium, Firefox, WebKit, Chrome, or another external browser payload.

## Execution boundary

- Trigger `.github/workflows/browser-tests.yml` manually from the repository's Actions page.
- The workflow uses Node from `.node-version`, installs browsers only on disposable GitHub-hosted Linux runners, and grants the workflow token `contents: read` only.
- Tests build NeumanOS and serve a task-owned production preview on `127.0.0.1:4173`. They cannot accept `TEST_BASE_URL` or target production.
- Browser contexts use synthetic test data only. Never add credentials, authenticated profiles, cookies, tokens, private backups, or production data.
- Failure reports, screenshots, videos, and traces are retained for three days. Successful runs upload no browser artifact.
- CamoFox on TJN-SERVE is a source-intake browser, not an end-to-end test runner.

The checked-in `npm run test:e2e` entry is intentionally guarded. It fails closed unless invoked by the exact manual GitHub-hosted Linux workflow with one approved browser project. Do not attempt to bypass that guard or emulate hosted-runner environment variables locally.

## Current inventory and readiness

Run `npm run test:browser:inventory` for a static, non-browser inventory. It reports spec files, source-level test declarations, missing critical files, exclusive tests, and every `skip` or `fixme` site.

Stage A establishes the hosted lane but does not pretend skipped coverage is green. The workflow's final `critical-coverage-readiness` job fails while any browser test remains skipped or fixed. At the Stage-A baseline:

- persistence across reloads, tabs, IndexedDB stores, and large synthetic datasets has active coverage;
- offline mutation coverage is skipped;
- the basic backup test may skip dynamically when its UI contract is absent, while edge-case and schema-migration cases are skipped;
- multiple automation-engine behaviors and all six cross-feature integration scenarios are skipped;
- accessibility coverage checks semantic structure, focus, and ARIA behavior but is not a complete WCAG audit;
- responsive coverage includes mobile, tablet, and desktop viewports, with some assertions still needing strengthening;
- the file named `visual-regression.spec.ts` performs computed-style smoke checks and has no golden-image baseline;
- performance coverage uses route-load, navigation, request-count, and idle-error smoke thresholds.

Dependency isolation or removal is a later gate. Do not remove the root browser-test dependency until a hosted run proves the replacement lane at an exact commit and the critical readiness gaps have a reviewed disposition.

## Hosted project matrix

The manual workflow preserves all five configured projects while limiting each runner to the browser family it needs:

| Hosted lane | Projects |
|---|---|
| Chromium | `chromium`, `mobile-chrome` |
| Firefox | `firefox` |
| WebKit | `webkit`, `mobile-safari` |

Each project runs with one worker and bounded retries against the same production preview. The workflow does not cache browser binaries.

## Test organization

Critical data and integration files include:

| File | Intended protection |
|---|---|
| `data-persistence.spec.ts` | IndexedDB persistence, reload/tab lifecycle, large data, offline behavior |
| `persistence-flows.spec.ts` | Task, note, settings, and cross-page persistence |
| `backup-restore.spec.ts` | `.brain` export/import integrity, edge cases, large data, schema migration |
| `automation-engine.spec.ts` | Execution ordering, conditions, and loop prevention |
| `automation-rules.spec.ts` | Rule creation, editing, toggling, deletion, triggers, and history |
| `cross-feature-integration.spec.ts` | Tasks, calendar, timers, automations, wikilinks, exports, dependencies, and tags |
| `accessibility.spec.ts` | Landmarks, semantics, keyboard focus, and modal focus containment |
| `responsive.spec.ts` | Mobile, tablet, and desktop layout behavior |
| `visual-regression.spec.ts` | Styling and theme smoke checks |
| `performance.spec.ts` | Load, navigation, request-count, and idle-error thresholds |

Shared deterministic factories and IndexedDB helpers live in `tests/fixtures/test-data.ts`. The custom fixture in `tests/fixtures/test-utils.ts` creates isolated browser state. Tests should continue to:

1. use synthetic deterministic data;
2. isolate or explicitly seed IndexedDB/local storage;
3. use semantic selectors;
4. wait for durable storage after mutations;
5. assert the complete behavior rather than conditionally passing when UI is absent;
6. close task-owned resources and avoid external network dependencies.

## Non-browser local checks

These checks do not install or launch a browser:

```bash
npm run test:browser:inventory
npm test -- --run
npm run type-check
npm run build
npm run ci
```

Do not run the hosted browser-test command, interactive test UI, headed/debug modes, browser installers, report viewers, or a local preview server for this suite on TJNMPM.

## Failure evidence

On failure, the workflow may retain `tests/reports/` and `tests/results/` for three days. Treat those artifacts as potentially sensitive even though the suite must use synthetic data. Do not publish them to a public site or copy them into the repository.

Before accepting a run, record:

- exact repository commit;
- workflow run URL and conclusion;
- each project result;
- passed, failed, flaky, and skipped counts;
- critical readiness result;
- artifact names and expiry, if any;
- confirmation that no production URL, credential, or external account was used.
