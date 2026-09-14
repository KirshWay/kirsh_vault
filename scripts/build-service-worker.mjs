import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRODUCTION_BASE_PATH } from '../lib/config/site.mjs';

export async function buildServiceWorker(outputDirectory) {
  async function collect(directory, prefix = '') {
    const entries = await readdir(directory, { withFileTypes: true });
    const paths = await Promise.all(
      entries
        .filter(
          (entry) =>
            !entry.name.startsWith('.') &&
            !entry.name.endsWith('.map') &&
            entry.name !== 'service-worker.js'
        )
        .map((entry) =>
          entry.isDirectory()
            ? collect(join(directory, entry.name), `${prefix}${entry.name}/`)
            : [`${prefix}${entry.name}`]
        )
    );
    return paths.flat().sort();
  }
  const files = await collect(outputDirectory);
  const hash = createHash('sha256');
  for (const file of files) hash.update(file).update(await readFile(join(outputDirectory, file)));
  const source = await readFile(new URL('./service-worker.js', import.meta.url), 'utf8');
  hash.update(source);
  const revision = hash.digest('hex').slice(0, 20);
  const urls = files.map((file) => `${PRODUCTION_BASE_PATH}/${file}`);
  const worker = `const BUILD_REVISION = ${JSON.stringify(revision)};\nconst PRECACHE_URLS = ${JSON.stringify(urls)};\n${source}`;
  await writeFile(join(outputDirectory, 'service-worker.js'), worker);
  await writeFile(join(outputDirectory, '.nojekyll'), '');
  return { revision, urls };
}

if (import.meta.main) {
  await buildServiceWorker(fileURLToPath(new URL('../out/', import.meta.url)));
}
