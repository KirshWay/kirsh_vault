// @vitest-environment node
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { buildServiceWorker } from './build-service-worker.mjs';

test('generates a complete deterministic release without overwriting the exported 404', async () => {
  const output = await mkdtemp(join(tmpdir(), 'kirsh-export-test-'));
  try {
    await mkdir(join(output, '_next/static'), { recursive: true });
    await writeFile(join(output, 'index.html'), 'home');
    await writeFile(join(output, '404.html'), 'Next 404');
    await writeFile(join(output, 'books.txt'), 'RSC');
    await writeFile(join(output, '_next/static/app.js'), 'app');
    await writeFile(join(output, '.DS_Store'), 'ignored');
    const first = await buildServiceWorker(output);
    expect(first.urls).toEqual([
      '/kirsh_vault/404.html',
      '/kirsh_vault/_next/static/app.js',
      '/kirsh_vault/books.txt',
      '/kirsh_vault/index.html',
    ]);
    expect((await buildServiceWorker(output)).revision).toBe(first.revision);
    expect(await readFile(join(output, '404.html'), 'utf8')).toBe('Next 404');
    expect(await readFile(join(output, '.nojekyll'), 'utf8')).toBe('');
    await writeFile(join(output, '_next/static/app.js'), 'updated app');
    expect((await buildServiceWorker(output)).revision).not.toBe(first.revision);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('the build command generates a worker from a checkout path containing spaces', async () => {
  const { copyFile } = await import('node:fs/promises');
  const { execFileSync } = await import('node:child_process');
  const checkout = await mkdtemp(join(tmpdir(), 'Kirsh Vault test-'));
  try {
    await mkdir(join(checkout, 'scripts'), { recursive: true });
    await mkdir(join(checkout, 'lib/config'), { recursive: true });
    await mkdir(join(checkout, 'out'), { recursive: true });
    for (const file of [
      'scripts/build-service-worker.mjs',
      'scripts/service-worker.js',
      'lib/config/site.mjs',
    ]) {
      await copyFile(new URL(`../${file}`, import.meta.url), join(checkout, file));
    }
    await writeFile(join(checkout, 'out/index.html'), 'home');
    execFileSync(process.execPath, [join(checkout, 'scripts/build-service-worker.mjs')]);
    expect(await readFile(join(checkout, 'out/service-worker.js'), 'utf8')).toContain(
      '/kirsh_vault/index.html'
    );
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
});
