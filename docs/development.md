# Development and verification

[Back to Kirsh Vault](../README.md)

## Toolchain

Use Node.js **24.21.0** and Bun **1.4.2**. The workflows pin Node.js; `package.json` declares Bun in `packageManager`, which `setup-bun` reads automatically. Bun installs dependencies and runs scripts; Next.js, Vitest and Playwright execute with Node.js.

Install with `bun install --frozen-lockfile`. Keep `bun.lock` with dependency changes. When updating Node.js, update both workflows and these instructions, then rerun the checks and production build with that version. The application itself is a static export and does not need Node.js on its host.

## Check changes

```sh
bun run lint
bun run typecheck
bun run test
bun run test:coverage
bun audit
bun run build
```

`bun run test:watch` starts watch mode. Coverage is collected with Vitest's V8 provider and written to `coverage/`; it includes application files that have no tests, rather than reporting only exercised files.

### React Doctor

[React Doctor](https://www.react.doctor/docs) supplements ESLint and the test suite with React-specific static analysis. It is a pinned development dependency and is not included in the application bundle.

```sh
bun run doctor
bun run doctor:changes --base origin/main
```

The first command scans the full project. The second compares against the chosen base and reports introduced findings, including ordinary untracked source files. Run it against the target branch of your pull request. Add `--verbose` for details or `--json` for a machine-readable report.

The separate [React Doctor workflow](../.github/workflows/react-doctor.yml) uses the official Action to compare PR changes with their base. A full checkout supplies the comparison history. It updates one PR summary comment; inline review comments and duplicate commit statuses are disabled. Runs on `main` and manual runs produce a full-project report in the Actions job summary. Fork PRs keep the report in Actions because their tokens cannot write comments.

The policy in [doctor.config.json](../doctor.config.json) is **advisory**: findings remain visible without failing the check. A failed scan is still a tooling failure on pull requests; it is not disguised with `continue-on-error`. This workflow is independent of deployment. ESLint, TypeScript, dependency audit and tests remain the deployment gates.

External score calculation, share links and telemetry are disabled. Socket.dev checks are disabled here; `bun audit` checks the locked dependencies in the existing CI job. Static React rules remain enabled without project-wide suppressions. Review findings in context: sequential image/ZIP processing bounds memory, for example, so a suggestion to parallelize awaits needs a memory assessment before changing code. Do not treat a scanner score as a quality target.

The Action follows the `v2` major-version tag and the CLI is pinned to an exact npm version. When upgrading, update the CLI version in both `package.json` and the workflow, refresh `bun.lock`, review the official [Action reference](https://www.react.doctor/docs/reference/github-action-reference) and [configuration reference](https://www.react.doctor/docs/configuration/config-files), then run a full scan and the normal checks. Tighten `blocking` only after reviewing the findings and agreeing on the gate. No Git hooks or agent integrations are installed.

Regression tests cover real Dexie queries with an isolated in-memory IndexedDB implementation, schema migration, search before pagination, category moves, storage failures, duplicate submissions, image processing, keyboard interactions and service-worker cache isolation. Backup tests include exact round trips, malformed files, cancellation, concurrent changes, stale forms and transaction rollback after an injected write failure.

Run the browser suite against the production export at `/kirsh_vault/`:

```sh
bunx playwright install chromium firefox webkit
bun run build
bun run test:e2e
```

Playwright runs headlessly and intercepts file selection before a native dialog can open. It exercises downloads, isolated browser contexts, multiple tabs, short mobile viewports and offline startup in Chromium, Firefox and WebKit. Gallery checks cover viewport bounds, zoom and pan, thumbnail counts, focus-loop boundaries, focus restoration and first-time offline loading. Native pinch, double-tap and swipe injection uses Chromium's debugging protocol; that specific scenario is skipped in Firefox and WebKit. The test server is local test infrastructure, not part of deployment. An optional, more expensive check processes a real image archive close to the 250 MiB limit and attaches timing measurements:

```sh
KIRSH_LARGE_BACKUP=1 bun run test:e2e -g 'near 250 MB' --workers=1
```

Offline behavior must be checked against a production export: verify direct category loads without a network connection and activation of a downloaded update after all old app tabs close. A local static server used for this check must serve the export at `/kirsh_vault/`, matching the deployed site.

## Code map

| Area                                         | Responsibility                                                     |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `app/`                                       | Static routes, metadata and the application shell                  |
| `components/templates/CollectionPage.tsx`    | Shared collection screen for Home and category pages               |
| `lib/hooks/useCollectionItems.ts`            | Reactive data queries, filtering, pagination and mutation feedback |
| `lib/db.ts`                                  | IndexedDB schema, migration and transactional queries              |
| `lib/search.ts`                              | Search ranking and rating/category predicates                      |
| `lib/item-schema.ts`                         | Form validation and inferred data types                            |
| `lib/image-policy.ts`, `image-validation.ts` | Shared image limits, header inspection and native decoding         |
| `lib/images.ts`                              | Image resizing and normalization before storage                    |
| `lib/backup/format.ts`, `image.ts`           | Versioned backup schema and embedded-image handling                |
| `lib/backup/archive.ts`, `backup.worker.ts`  | Sequential ZIP processing, staging and cross-tab operation lock    |
| `lib/hooks/useBackup.ts`                     | Typed operation states, cancellation and worker recovery           |
| `components/BackupMenu.tsx`                  | Backup download, restore preview and confirmation                  |
| `components/ui/image-viewer.tsx`             | On-demand lightbox, zoom controls and image selection              |
| `components/ui/`                             | Accessible controls built with Radix UI and Tailwind CSS           |
| `scripts/build-service-worker.mjs`           | Release manifest and content-versioned offline worker              |
| `scripts/service-worker.js`                  | Cache installation, request handling and release cleanup           |

Data flows from the validated form to Dexie. Its live queries refresh lists and counts after changes, including writes from another tab. A failed save keeps the form open; a failed read displays a retryable error instead of an empty collection. Editing checks the version captured when the form opened, so another tab’s changes cannot be silently overwritten. Conflicts keep the draft visible. Deletion requires confirmation and checks that the confirmed record is still current. Save and delete dialogs cannot be dismissed while their database writes are pending.

Every collection mutation advances a revision in the same transaction. Restore preparation writes to separate temporary tables; confirmation checks that revision and atomically replaces the collection. A new generation identifier invalidates older forms, and a durable operation receipt distinguishes a committed restore from a lost worker response. ZIP processing runs in a dedicated Web Worker created when backup functionality is used.

Unfiltered category pages use a compound category/date index and read only the requested page. Text search and rating filters scan a separate table without image payloads, rank results before pagination, then load full records only for the visible page. The derived table is migrated from existing records and maintained in the same transactions as the collection. Search remains a linear scan intended for personal collections, not a full-text search engine. New images have their format, byte size and declared dimensions checked before native decoding. They are decoded sequentially, resized to a maximum of 1600 pixels on the longest side, and re-encoded for storage. Existing image data is preserved.

## Gallery controls

Select a photo to open the gallery. Use **Zoom in**, **Zoom out** or a double-click/pinch to inspect
details, and **Fit** to show the whole image again. Drag an enlarged photo to move around it.
Arrow keys browse photos when fitted and pan when enlarged; **Escape** closes the gallery and
returns focus to the photo you opened. The viewer loads on demand and is available offline after
the app's assets have been cached. Ordinary uploads are resized to at most 1600 pixels along the
longer edge; zoom displays the stored image and cannot recover detail removed during resizing.

## Offline releases and deployment

The worker precaches the static export, including Next.js navigation payloads, application chunks and backup worker modules. Each build derives its cache revision from file contents. It serves a consistent release, handles static-route aliases and HEAD requests, and only cleans up this application's caches.

A downloaded update activates after all tabs using the previous release close. This follows the [service-worker lifecycle](https://developer.chrome.com/docs/workbox/service-worker-lifecycle) and avoids replacing resources underneath an open form. Reopen the app to use the installed update.

GitHub Actions checks pull requests and pushes to `main`: frozen dependency installation, audit, lint, type checking, unit/component tests, a production build, and Playwright tests in all three browsers against that exact static export. Browser reports are retained for seven days. A separate deployment job runs **only for pushes to `main`, after its required checks pass**, and publishes the verified `out/` artifact to `gh-pages`. Only this deployment job can write repository contents; React Doctor can update its PR summary comment. The near-limit archive benchmark remains opt-in. The production base path is defined in `lib/config/site.mjs`; the manifest also targets `/kirsh_vault/`.

Security and cache headers must be configured by the hosting provider. Next.js `headers()` is not available for a static export.

The deployment Action follows `JamesIves/github-pages-deploy-action@v4`. GitHub Pages must use **Deploy from a branch → gh-pages → / (root)**. The `.nojekyll` file generated with the service worker is included in the uploaded site artifact so Next.js assets under `_next/` are served unchanged. See the [Next.js static-export guide](https://nextjs.org/docs/app/guides/static-exports) and the [deployment Action's setup instructions](https://github.com/JamesIves/github-pages-deploy-action#readme).
