# Kirsh Vault backup format

## Version 1

A backup is an ordinary, unencrypted ZIP containing `collection.json` and referenced image files. The download name includes the UTC export timestamp, for example `kirsh-vault-2026-09-14T12-00-00Z.zip`. The JSON format version is independent of the IndexedDB schema version. An unsupported version is rejected without modifying the collection.

```json
{
  "format": "kirsh-vault-backup",
  "formatVersion": 1,
  "exportedAt": "2026-09-14T12:00:00.000Z",
  "items": [
    {
      "id": 7,
      "name": "  A book  ",
      "description": "First line\nSecond line  ",
      "category": "book",
      "rating": 7.5,
      "createdAt": "2024-01-02T03:04:05.006Z",
      "images": ["images/7/0.png"]
    }
  ]
}
```

| Field                     | Contract                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `id`                      | Unique positive JavaScript safe integer; restored unchanged                        |
| `name`                    | Nonempty string with at least one non-whitespace character; no trimming            |
| `description`             | Optional string; empty strings, spaces and newlines preserved                      |
| `category`                | `book`, `movie` or `other`                                                         |
| `rating`                  | Optional finite number from 0 to 10, including fractional values                   |
| `createdAt`, `exportedAt` | Canonical UTC timestamps produced by `Date.toISOString()`, including milliseconds  |
| `images`                  | Optional ordered list of up to five paths; omitted and empty lists remain distinct |

Optional fields cannot contain `null`. Unknown fields are rejected. An empty `items` list is valid and means full deletion when restored. IDs, creation times, text and ratings survive a round trip; the export timestamp describes the newly created copy.

Each image path is exactly `images/<item-id>/<zero-based-index>.<extension>`, where the extension is `jpeg`, `png` or `webp`. Repeated images get separate files at their original positions. File bytes are preserved; restored images use embedded data URLs for compatibility with the existing collection store. URLs, HTML, SVG and remote downloads are not part of this format.

The exporter uses ZIP STORE because supported images are already compressed. The importer also accepts DEFLATE. Directory entries, unrelated files, duplicate paths, duplicate IDs, missing images, encrypted entries and other compression methods are rejected. The application creates all required paths itself; no archive entry is extracted to the filesystem.

The [v1 ZIP fixture](../lib/backup/fixtures/v1.zip), [its manifest](../lib/backup/fixtures/v1.json) and image fixtures are compatibility inputs. Keep these fixtures unchanged when introducing future formats and verify that older supported versions still restore. JPEG and WebP fixtures are separate native-decoder test inputs; the v1 ZIP contains the PNG fixture.

## Limits and validation

| Resource                                               | Maximum                     |
| ------------------------------------------------------ | --------------------------- |
| Input ZIP and total unpacked file bytes, each          | 262,144,000 bytes (250 MiB) |
| Collection items                                       | 10,000                      |
| Images per item                                        | 5                           |
| ZIP files                                              | 50,001                      |
| `collection.json`, each image, each ZIP directory read | 10,485,760 bytes (10 MiB)   |
| Image width × height                                   | 40,000,000 pixels           |

ZIP headers are an early check, not the source of truth: bounded streams count actual output bytes during extraction. [zip.js](https://gildas-lormeau.github.io/zip.js/) checks CRC32 and overlapping entries. JSON is decoded as strict UTF-8 and validated before any collection replacement. Image container headers establish dimensions before native decoding; decoded dimensions and file type must match. Native decoding occurs sequentially, and each bitmap is released immediately. Archive text is rendered as React text, never HTML.

Export applies the same schema and image checks. An incompatible legacy entry fails the whole export with its ID and name. It is never silently omitted. New backups contain original stored image bytes, not another resized or recompressed copy.

## Storage and concurrency guarantees

IndexedDB schema 3 adds collection metadata, temporary import records and preparation sessions. Upgrading from schema 2 preserves the existing collection. Schema 4 adds a derived search table without images, an independent item-ID allocation cursor and retired IDs. Migration preserves records and existing collection metadata, reading one full record at a time. Each successful CRUD mutation updates the collection revision and search data in its write transaction.

New entries receive explicit positive safe integer IDs inside the write transaction, independently of IndexedDB’s native auto-increment counter. A supported backup containing the maximum safe ID therefore does not prevent subsequent creation. Deleted IDs are not reused within the same collection generation; this also protects older drafts for deleted imported records. Restore preserves every incoming ID and resets allocation state together with the new generation.

Ordinary edits and deletion confirmations capture the item’s internal revision as well as the collection generation. The write transaction checks both before changing data; edits increment the item revision in the same transaction. Unrelated item changes do not invalidate the draft. Legacy and restored records without an internal revision start at zero, without rewriting their fields or images. This internal field is excluded from ZIP format v1.

One origin-scoped Web Lock serializes backup sessions across tabs, including an open preview. A worker reads and validates the archive sequentially and stages one item at a time in IndexedDB. The current collection remains untouched. Preview captures the current revision and count after preparation. Export checks its initial revision again after writing the archive and refuses to return a mixed snapshot if data changed.

Confirmation starts one [Dexie read/write transaction](<https://dexie.org/docs/Dexie/Dexie.transaction()>) that checks the expected revision, removes current entries and derived search data, copies prepared records and their search fields, resets ID allocation, changes the collection generation, records the completed operation ID and removes temporary data. Only database work occurs inside this transaction; no decompression, image decoding or user interaction can leave it idle. A failure after deletion or partway through insertion rolls the entire transaction back.

If another tab has changed the collection since preview, confirmation refreshes the consequences and requires another click. If a form belongs to an older generation, both the interface and database reject its write while the draft remains visible. Cancellation is available during preparation and preview; once replacement starts, controls cannot close or resubmit it. There is no built-in undo after a successful replacement.

Temporary data is removed on cancellation and completion. Abandoned data is cleaned at the next app startup or backup operation only after acquiring the same lock. A terminated worker cannot release a partial collection replacement: IndexedDB either commits or aborts its transaction. The committed operation ID allows the page to recognize success even if the completion message is lost. If browser storage itself cannot be read, the app explicitly asks the user to reload and check the collection instead of claiming a rollback.

Restoration needs room for the current collection, staged images and the replacement transaction. Base64 storage and browser accounting make a precise space forecast unreliable. `navigator.storage.estimate()` supplies a warning only; actual quota errors abort safely. Normal browser storage eviction and manual site-data deletion remain outside these transaction guarantees. Keep downloaded copies outside the browser.

## Browser verification

The Playwright suite uses the actual static export under `/kirsh_vault/` in Chromium and Firefox. It intercepts the file chooser before clicking the restore action, so native file dialogs stay closed. It exercises safe creation after extreme-ID and empty restores, independent contexts, exact image bytes, two-tab conflicts, retained drafts, operation locks, empty replacement, downloads from preview, lost completion notifications and a 375 × 568 viewport with reduced motion.

Offline tests first install the production service worker, then enable Playwright's offline emulation and verify an uncached request fails while reload and backup still work.

The service worker precaches the emitted backup chunks. Cached responses preserve the worker request URL, including bundler bootstrap parameters. This follows the browser's [response URL rules](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent/respondWith#specifying_the_final_url_of_a_resource) and is covered by a regression test.

After restoring from a category, the Next.js router receives the absolute canonical root URL, preserving its trailing slash. This resets the category and keeps navigation requests inside the static export and service-worker scope. The browser suite covers this transition offline as well as online.

### Large archive measurements

Measured on 2026-09-14 on macOS, Apple M3 Pro, 36 GiB RAM, with one headless browser test at a time, after the schema 4 and shared image-validation changes. The generated ZIP is **260,147,070 bytes (248.10 MiB)** and contains 231 entries, each with a valid noisy 750 × 500 PNG. Images are stored without ZIP compression. These are observations from this workload and machine, not speed or memory guarantees for every device.

| Engine                 | Validation and staging | Replace and display | Export preparation | Largest main-thread timer gap |
| ---------------------- | ---------------------: | ------------------: | -----------------: | ----------------------------: |
| Chromium 153.0.8010.12 |                 6.69 s |              1.63 s |            12.12 s |                         92 ms |
| Firefox 155.0          |                11.37 s |              7.97 s |             8.72 s |                        111 ms |

Validation timing includes file selection and waiting for an enabled confirmation. Replacement timing includes the next visible collection render, and export timing ends when the download action becomes available. A 50 ms interval sampled main-thread responsiveness through all phases; the reported gap includes the interval itself. This is a responsiveness check, not an FPS measurement. The downloaded archive was checked against the size cap; byte equality is covered separately by smaller PNG/JPEG/WebP round trips.

The mobile check uses a 375 × 568 desktop-browser viewport and reduced motion. Physical phones, their lower storage quotas and their memory pressure were not measured. Re-run the opt-in benchmark on target devices before relying on comparable performance there. Full-size image workloads can need substantially more transient memory than the small images used here, even at the same ZIP size.
