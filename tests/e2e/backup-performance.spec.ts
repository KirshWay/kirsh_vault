import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { selectBackup } from './choose-backup';
import { createLargeBackup } from './large-backup';

test('processes a backup near 250 MB while the interface remains responsive', async ({
  page,
  browser,
}, testInfo) => {
  test.skip(!process.env.KIRSH_LARGE_BACKUP, 'Opt-in storage and performance check');
  test.setTimeout(180_000);
  const directory = await mkdtemp(join(tmpdir(), 'kirsh-backup-benchmark-'));
  try {
    const file = join(directory, 'large.zip');
    const itemCount = await createLargeBackup(file);
    const bytes = (await stat(file)).size;
    expect(bytes).toBeGreaterThan(247 * 1024 ** 2);
    expect(bytes).toBeLessThanOrEqual(250 * 1024 ** 2);
    await page.goto('./');
    await page.evaluate(() => {
      const timings = { last: performance.now(), maxGapMs: 0, ticks: 0 };
      Object.assign(window, { backupTimings: timings });
      setInterval(() => {
        const now = performance.now();
        timings.maxGapMs = Math.max(timings.maxGapMs, now - timings.last);
        timings.last = now;
        timings.ticks++;
      }, 50);
    });
    const validationStart = performance.now();
    await selectBackup(page, file);
    const replace = page.getByRole('button', { name: 'Replace collection', exact: true });
    await expect(replace).toBeEnabled({ timeout: 120_000 });
    const validationMs = performance.now() - validationStart;
    const restoreStart = performance.now();
    await replace.click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 120_000 });
    await expect(
      page.getByRole('heading', { name: `Performance item ${itemCount}`, exact: true })
    ).toBeVisible();
    const restoreMs = performance.now() - restoreStart;
    await page.getByRole('button', { name: 'Data', exact: true }).click();
    const exportStart = performance.now();
    await page.getByRole('menuitem', { name: 'Download backup' }).click();
    const save = page.getByRole('button', { name: 'Save backup', exact: true });
    await expect(save).toBeEnabled({ timeout: 120_000 });
    const exportMs = performance.now() - exportStart;
    const download = page.waitForEvent('download');
    await save.click();
    const downloadPath = await (await download).path();
    expect((await stat(downloadPath!)).size).toBeLessThanOrEqual(250 * 1024 ** 2);
    const timings = await page.evaluate(
      () =>
        (
          window as unknown as {
            backupTimings: { maxGapMs: number; ticks: number };
          }
        ).backupTimings
    );
    const measurements = {
      browser: browser.version(),
      archiveBytes: bytes,
      itemCount,
      validationMs,
      restoreMs,
      exportMs,
      maxMainThreadGapMs: timings.maxGapMs,
    };
    const measurementsPath = testInfo.outputPath('measurements.json');
    await writeFile(measurementsPath, JSON.stringify(measurements, null, 2));
    await testInfo.attach('measurements', {
      path: measurementsPath,
      contentType: 'application/json',
    });
    expect(timings.ticks).toBeGreaterThan(10);
    expect(timings.maxGapMs).toBeLessThan(1500);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
