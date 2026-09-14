import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  Uint8ArrayReader,
  Uint8ArrayWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js/index-native.js';

import fixtureManifest from '../../lib/backup/fixtures/v1.json';
import { selectBackup } from './choose-backup';

const fixture = resolve('lib/backup/fixtures/v1.zip');

test('validates and stores an ordinary image upload through the item form', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Add First Item', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Uploaded photo');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Add images', exact: true }).click();
  await (await chooser).setFiles(resolve('lib/backup/fixtures/pixel.png'));
  await expect(page.getByRole('status')).toContainText('1 of 5 images');
  await page.getByRole('dialog').getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const image = page.getByRole('img', { name: 'Uploaded photo', exact: true });
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', /^data:image\/(webp|png);base64,/);
});

test('adding remains safe after restoring extreme IDs and then an empty backup', async ({
  page,
}) => {
  const record = { ...fixtureManifest.items[1], id: Number.MAX_SAFE_INTEGER };
  const zip = async (items: (typeof record)[]) => {
    const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
    await writer.add(
      'collection.json',
      new TextReader(JSON.stringify({ ...fixtureManifest, items }))
    );
    return Buffer.from(await (await writer.close()).arrayBuffer());
  };
  await page.goto('./');
  await selectBackup(page, {
    name: 'extreme-id.zip',
    mimeType: 'application/zip',
    buffer: await zip([record]),
  });
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Add Item', exact: true }).click();
    await page.getByLabel('Name', { exact: true }).fill(`New item ${i}`);
    await page.getByRole('dialog').getByRole('button', { name: 'Add Item', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: `New item ${i}`, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Download backup' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const reader = new ZipReader(
    new BlobReader(new Blob([await readFile((await (await download).path())!)])),
    { useWebWorkers: false }
  );
  try {
    const entry = (await reader.getEntries()).find((entry) => entry.filename === 'collection.json');
    if (!entry || entry.directory) throw new Error('Missing manifest');
    const manifest = JSON.parse(await entry.getData(new TextWriter()));
    expect(manifest.items).toHaveLength(4);
    expect(manifest.items.every((item: { id: number }) => Number.isSafeInteger(item.id))).toBe(
      true
    );
    expect(manifest.items.find((item: { id: number }) => item.id === record.id)).toEqual(record);
  } finally {
    await reader.close();
  }
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await selectBackup(page, {
    name: 'empty.zip',
    mimeType: 'application/zip',
    buffer: await zip([]),
  });
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Add First Item', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('After empty restore');
  await page.getByRole('dialog').getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'After empty restore', exact: true })
  ).toBeVisible();
});

test('preserves JPEG, PNG, WebP and repeated images byte for byte', async ({ page }) => {
  const extensions = ['jpeg', 'png', 'webp', 'png'];
  const images = await Promise.all(
    extensions.map((extension) => readFile(`lib/backup/fixtures/pixel.${extension}`))
  );
  const record = {
    ...fixtureManifest.items[0],
    images: extensions.map((extension, index) => `images/7/${index}.${extension}`),
  };
  const manifest = { ...fixtureManifest, items: [record, fixtureManifest.items[1]] };
  const writer = new ZipWriter(new BlobWriter(), { useWebWorkers: false, level: 0 });
  await writer.add('collection.json', new TextReader(JSON.stringify(manifest)));
  for (const [index, path] of record.images.entries())
    await writer.add(path, new Uint8ArrayReader(images[index]));
  const buffer = Buffer.from(await (await writer.close()).arrayBuffer());
  await page.goto('./');
  await selectBackup(page, { name: 'images.zip', mimeType: 'application/zip', buffer });
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Download backup' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const downloaded = await readFile((await (await pending).path())!);
  const reader = new ZipReader(new BlobReader(new Blob([downloaded])), {
    useWebWorkers: false,
    checkCrc32: true,
  });
  try {
    for (const entry of await reader.getEntries()) {
      if (entry.directory) throw new Error('Unexpected directory');
      if (entry.filename === 'collection.json') {
        expect(JSON.parse(await entry.getData(new TextWriter())).items).toEqual(manifest.items);
      } else {
        const index = record.images.indexOf(entry.filename);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(Buffer.from(await entry.getData(new Uint8ArrayWriter()))).toEqual(images[index]);
      }
    }
  } finally {
    await reader.close();
  }
});

async function chooseBackup(page: Page, file = fixture) {
  await selectBackup(page, file);
  await expect(page.getByRole('button', { name: 'Replace collection', exact: true })).toBeEnabled();
}

async function restoreFixture(page: Page) {
  await chooseBackup(page);
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'An item', exact: true })).toBeVisible();
}

test('downloads and restores a portable copy in a separate browser context', async ({
  page,
  browser,
}) => {
  await page.goto('./');
  await restoreFixture(page);
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Download backup' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save backup', exact: true }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const isolated = await browser.newContext();
  try {
    const target = await isolated.newPage();
    await target.goto(page.url());
    await chooseBackup(target, path!);
    await target.getByRole('button', { name: 'Replace collection', exact: true }).click();
    await expect(target.getByRole('dialog')).not.toBeVisible();
    await expect(target.getByRole('heading', { name: 'A book', exact: true })).toBeVisible();
    await expect(target.getByRole('img', { name: 'A book', exact: true })).toBeVisible();
  } finally {
    await isolated.close();
  }
});

test('rejects a corrupt archive without replacing the collection', async ({ page }) => {
  await page.goto('./');
  await restoreFixture(page);
  const bytes = await readFile(fixture);
  const index = bytes.indexOf('A book');
  expect(index).toBeGreaterThan(0);
  bytes[index] = 66;
  await selectBackup(page, { name: 'corrupt.zip', mimeType: 'application/zip', buffer: bytes });
  await expect(
    page.getByRole('alert').filter({ hasText: /backup|signature|checksum|corrupt/i })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Replace collection', exact: true })
  ).not.toBeVisible();
});

test('a restore in another tab preserves and blocks an older edit draft', async ({
  page,
  context,
}) => {
  await page.goto('./');
  await restoreFixture(page);
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  await page.getByLabel('Name', { exact: true }).fill('Unsaved draft');
  const second = await context.newPage();
  await second.goto(page.url());
  await restoreFixture(second);
  await expect(page.getByRole('button', { name: 'Update Item' })).toBeDisabled();
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Unsaved draft');
  await expect(page.getByRole('alert').filter({ hasText: /restored/i })).toBeVisible();
});

test('requires fresh confirmation after a concurrent change', async ({ page, context }) => {
  await page.goto('./');
  await restoreFixture(page);
  const second = await context.newPage();
  await second.goto(page.url());
  await chooseBackup(second);
  await page.getByRole('button', { name: 'Add Item', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Concurrent item');
  await page.getByRole('dialog').getByRole('button', { name: 'Add Item', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Concurrent item' })).toBeVisible();
  await second.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText(/changed/i);
  await expect(second.getByText(/3 current items/)).toBeVisible();
  await second.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(second.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Concurrent item' })).not.toBeVisible();
});

test('coordinates backup operations across tabs and releases the lock on cancel', async ({
  page,
  context,
}) => {
  await page.goto('./');
  await chooseBackup(page);
  const second = await context.newPage();
  await second.goto(page.url());
  await second.getByRole('button', { name: 'Data', exact: true }).click();
  await second.getByRole('menuitem', { name: 'Download backup' }).click();
  await expect(second.getByRole('alert')).toContainText(/another tab/i);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await second.getByRole('button', { name: 'Close', exact: true }).last().click();
  await second.getByRole('button', { name: 'Data', exact: true }).click();
  await second.getByRole('menuitem', { name: 'Download backup' }).click();
  await expect(second.getByRole('button', { name: 'Save backup', exact: true })).toBeEnabled();
});

test('restores and exports offline after the production assets are cached', async ({
  page,
  context,
}) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated');
  await context.setOffline(true);
  expect(
    await page.evaluate(() =>
      fetch('uncached-offline-probe', { cache: 'no-store' })
        .then(() => false)
        .catch(() => true)
    )
  ).toBe(true);
  await page.reload();
  await page.goto('books');
  await restoreFixture(page);
  await page.getByRole('button', { name: 'Data', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Download backup' }).click();
  await expect(page.getByRole('button', { name: 'Save backup', exact: true })).toBeEnabled();
});

test('downloads the current collection from preview and can restore that empty copy', async ({
  page,
}) => {
  await page.goto('./');
  await chooseBackup(page);
  await page.getByRole('button', { name: 'Download current backup', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save current backup', exact: true }).click();
  await expect(page.getByText(/Current backup is ready \([\d.]+ KB\)/)).toBeVisible();
  const file = await (await pending).path();
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await chooseBackup(page, file!);
  await expect(page.getByText('This will delete all current items.')).toBeVisible();
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Add First Item' })).toBeVisible();
});

test('recognizes a committed restore if its completion message is lost', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', (event) => {
          if (event.data.type === 'committed') {
            event.stopImmediatePropagation();
            this.dispatchEvent(new ErrorEvent('error', { message: 'Lost completion message' }));
          }
        });
      }
    };
  });
  await page.goto('./');
  await restoreFixture(page);
  await expect(page.getByText('Collection restored successfully')).toBeVisible();
});

test('a terminated preparation keeps the collection and is cleaned on the next operation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    let interrupted = false;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', (event) => {
          if (!interrupted && event.data.type === 'preview') {
            interrupted = true;
            event.stopImmediatePropagation();
            this.terminate();
            Object.assign(window, { backupWorkerInterrupted: true });
          }
        });
      }
    };
  });
  await page.goto('./');
  await selectBackup(page, fixture);
  await page.waitForFunction(() => 'backupWorkerInterrupted' in window);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Add First Item' })).toBeVisible();
  await chooseBackup(page);
  const stagedCount = await page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const request = indexedDB.open('kirshVault');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const count = database.transaction('stagedItems').objectStore('stagedItems').count();
          count.onsuccess = () => {
            database.close();
            resolve(count.result);
          };
          count.onerror = () => {
            database.close();
            reject(count.error);
          };
        };
      })
  );
  expect(stagedCount).toBe(2);
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'An item', exact: true })).toBeVisible();
});

test('restoration from a filtered category opens the complete collection', async ({ page }) => {
  await page.goto('./');
  await restoreFixture(page);
  await page.goto('books');
  await expect(page.getByRole('heading', { name: 'Books', exact: true })).toBeVisible();
  await page.getByPlaceholder('Search books...').fill('No matching item');
  await expect(page.getByRole('heading', { name: 'A book', exact: true })).not.toBeVisible();
  await chooseBackup(page);
  await expect(page.getByText(/2 current items/)).toBeVisible();
  await page.getByRole('button', { name: 'Replace collection', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My Collection', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Search in collection...')).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'A book', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'An item', exact: true })).toBeVisible();
});

test('keeps restore actions accessible on a short mobile screen and returns focus', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await chooseBackup(page);
  await page.screenshot({ path: testInfo.outputPath('restore-desktop.png') });
  await page.setViewportSize({ width: 375, height: 568 });
  const action = page.getByRole('button', { name: 'Replace collection', exact: true });
  const bounds = await action.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.screenshot({ path: testInfo.outputPath('restore-mobile.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Data', exact: true })).toBeFocused();
});
