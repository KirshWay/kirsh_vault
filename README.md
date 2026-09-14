# Kirsh Vault

A personal collection tracker for books, movies and other items. Built with Next.js, React and TypeScript, with data stored locally in the browser.

**[Open the app](https://kirshway.github.io/kirsh_vault/)**

## What it does

- Create, edit and delete entries with descriptions and up to five images.
- Rate books and movies on a 0–10 scale; move entries between categories.
- Search names and descriptions across the entire collection, combine category and rating filters, and browse matching results in pages of 12.
- Use the app offline after its first successful online installation. Installation as a standalone PWA depends on browser support.
- Navigate with a keyboard, zoom the page and use the system's reduced-motion preference.

## Run locally

Use **Node.js 24.17.0** and **Bun 1.4.2**, matching CI and the `packageManager` field. Bun installs dependencies and runs package scripts; Next.js and Vitest execute with Node.js.

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local address printed by Next.js in the terminal. The service worker is disabled in development so cached production assets cannot interfere with hot reload.

## Build for GitHub Pages

```sh
bun run build
```

The build generates static files in `out/`, including the offline worker. GitHub Actions publishes this directory to GitHub Pages on pushes to `main`; no application server is required on the host. See the [Next.js static-export guide](https://nextjs.org/docs/app/guides/static-exports) and [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

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

Regression tests cover real Dexie queries with an isolated in-memory IndexedDB implementation, schema migration, search before pagination, category moves, storage failures, duplicate submissions, image processing, keyboard interactions and service-worker cache isolation. Worker tests use browser API substitutes; verify installation and updates in a real browser before releasing changes to offline behavior.

Offline behavior must be checked against a production export: verify direct category loads without a network connection and activation of a downloaded update after all old app tabs close. A local static server used for this check must serve the export at `/kirsh_vault/`, matching the deployed site.

## Architecture

| Area                                      | Responsibility                                                     |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `app/`                                    | Static routes, metadata and the application shell                  |
| `components/templates/CollectionPage.tsx` | Shared collection screen for Home and category pages               |
| `lib/hooks/useCollectionItems.ts`         | Reactive data queries, filtering, pagination and mutation feedback |
| `lib/db.ts`                               | IndexedDB schema, migration and transactional queries              |
| `lib/search.ts`                           | Search ranking and rating/category predicates                      |
| `lib/item-schema.ts`                      | Form validation and inferred data types                            |
| `lib/images.ts`                           | Image resizing and normalization before storage                    |
| `components/ui/`                          | Accessible controls built with Radix UI and Tailwind CSS           |
| `scripts/build-service-worker.mjs`        | Release manifest and content-versioned offline worker              |
| `scripts/service-worker.js`               | Cache installation, request handling and release cleanup           |

Data flows from the validated form to Dexie. Its live queries refresh lists and counts after changes, including writes from another tab. A failed save keeps the form open; a failed read displays a retryable error instead of an empty collection.

Unfiltered category pages use a compound category/date index and read only the requested page. Text search ranks matching entries before pagination and currently scans the selected collection; it is intended for personal collections rather than a full-text search workload. New images are decoded sequentially, resized to a maximum of 1600 pixels on the longest side, and re-encoded for storage. Existing image data is preserved.

## Offline releases and deployment

The worker precaches the static export, including Next.js navigation payloads and application chunks. Each build derives its cache revision from file contents. It serves a consistent release, handles static-route aliases and HEAD requests, and only cleans up this application's caches.

A downloaded update activates after all tabs using the previous release close. This follows the [service-worker lifecycle](https://developer.chrome.com/docs/workbox/service-worker-lifecycle) and avoids replacing resources underneath an open form. Reopen the app to use the installed update.

GitHub Actions deploys **pushes to `main` only**. It installs the frozen lockfile, audits dependencies, runs lint, type checking and tests, then builds and publishes `out/` to `gh-pages`. The production base path is defined in `lib/config/site.mjs`; the manifest also targets `/kirsh_vault/`.

Security and cache headers must be configured by the hosting provider. Next.js `headers()` is not available for a static export.

## Storage and privacy

There is no account, backend API, analytics or cloud synchronization. Entries and images are stored in IndexedDB for the current browser profile and origin. They are not encrypted and should not contain passwords or other secrets.

Clearing site data, changing browsers or browser storage eviction can remove or separate the collection. Offline caching does not back up IndexedDB. The app currently has no export/import or cloud recovery feature. Browser storage limits and persistence vary by platform; see [MDN's storage guide](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Main libraries

Next.js · React · TypeScript · Dexie and dexie-react-hooks · React Hook Form and Zod · Radix UI · Tailwind CSS · Motion · React Hot Toast · Vitest and Testing Library.

Dependency versions are pinned in `package.json` where appropriate and resolved in `bun.lock`. Keep the lockfile with dependency changes and run the checks above before deployment.
