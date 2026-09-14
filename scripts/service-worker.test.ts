// @vitest-environment node
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { expect, test, vi } from 'vitest';

const scope = 'https://portfolio.example/kirsh_vault/';
const assets = [
  'index.html',
  'books.html',
  'books.txt',
  'books/__next._tree.txt',
  '_next/static/app.js',
  '404.html',
].map((path) => scope + path);
const source = readFileSync(new URL('./service-worker.js', import.meta.url), 'utf8');

function harness() {
  const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const fetch = vi.fn(
    async (request: Request | string) =>
      new Response(typeof request === 'string' ? request : request.url)
  );
  const key = (request: Request | string) =>
    typeof request === 'string' ? new URL(request, scope).href : request.url;
  function cache(name: string) {
    if (!stores.has(name)) stores.set(name, new Map());
    const values = stores.get(name)!;
    return {
      addAll: async (requests: (Request | string)[]) => {
        const responses = await Promise.all(
          requests.map(async (request) => [key(request), await fetch(request)] as const)
        );
        for (const [url, response] of responses) values.set(url, response);
      },
      match: async (request: Request | string) => values.get(key(request))?.clone(),
      put: async (request: Request | string, response: Response) => {
        values.set(key(request), response);
      },
    };
  }
  const caches = {
    open: async (name: string) => cache(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: Request | string) => {
      for (const name of stores.keys()) {
        const found = await cache(name).match(request);
        if (found) return found;
      }
    },
  };
  const skipWaiting = vi.fn();
  runInNewContext(source, {
    self: {
      registration: { scope },
      location: new URL(scope),
      clients: { claim: vi.fn() },
      skipWaiting,
      addEventListener: (name: string, handler: (typeof handlers)[string]) => {
        handlers[name] = handler;
      },
    },
    caches,
    fetch,
    URL,
    Request,
    Response,
    console,
    PRECACHE_URLS: assets,
    BUILD_REVISION: 'test-release',
  });
  async function lifecycle(name: string) {
    let task: Promise<unknown> = Promise.resolve();
    handlers[name]({
      waitUntil: (promise: Promise<unknown>) => {
        task = promise;
      },
    });
    await task;
  }
  function request(path: string, method = 'GET'): Promise<Response> | null {
    let response: Promise<Response> | null = null;
    handlers.fetch({
      request: new Request(new URL(path, scope), { method }),
      respondWith: (promise: Promise<Response>) => {
        response = promise;
      },
    });
    return response;
  }
  return { lifecycle, request, stores, fetch, cache, skipWaiting };
}

test('activation preserves sibling-app caches and removes only its previous release', async () => {
  const worker = harness();
  worker.cache('other-portfolio-cache');
  worker.cache(`kirsh-vault:${encodeURIComponent(scope)}:old-release`);
  worker.cache('kirsh-vault:https://portfolio.example/another/old-release');
  await worker.lifecycle('install');
  await worker.lifecycle('activate');
  expect(worker.stores.has('other-portfolio-cache')).toBe(true);
  expect(worker.stores.has('kirsh-vault:https://portfolio.example/another/old-release')).toBe(true);
  expect(worker.stores.has(`kirsh-vault:${encodeURIComponent(scope)}:old-release`)).toBe(false);
});

test('a complete release supports cold offline routes, JS, HEAD probes and RSC payloads', async () => {
  const worker = harness();
  await worker.lifecycle('install');
  worker.fetch.mockRejectedValue(new Error('offline'));
  for (const path of [
    'books',
    'books/',
    'books.txt?_rsc=cache-bust',
    'books/__next._tree.txt',
    '_next/static/app.js',
  ]) {
    const response = await worker.request(path);
    expect(response?.ok, path).toBe(true);
    expect(await response?.text(), path).not.toBe(scope);
  }
  const head = await worker.request('books', 'HEAD');
  expect(head?.ok).toBe(true);
  expect(await head?.text()).toBe('');
});

test('fetch reads its own release instead of an unrelated origin cache', async () => {
  const worker = harness();
  await worker.cache('unrelated').put(scope + 'books.html', new Response('poisoned'));
  await worker.lifecycle('install');
  expect(await (await worker.request('books.html'))?.text()).toBe(scope + 'books.html');
});

test('ignores sibling URLs, lookalike origins, POST and unknown resources', () => {
  const worker = harness();
  expect(worker.request('/another/app.js')).toBeNull();
  expect(worker.request('https://portfolio.example.evil/kirsh_vault/books')).toBeNull();
  expect(worker.request('books', 'POST')).toBeNull();
  expect(worker.request('missing.txt')).toBeNull();
});

test('does not force a new release onto open tabs and propagates install failure', async () => {
  const worker = harness();
  await worker.lifecycle('install');
  expect(worker.skipWaiting).not.toHaveBeenCalled();
  worker.fetch.mockRejectedValue(new Error('failed download'));
  await expect(worker.lifecycle('install')).rejects.toThrow('failed download');
});

test('activation preserves a separate app registered under a nested scope', async () => {
  const worker = harness();
  const nested = `kirsh-vault:${scope}tools/other-release`;
  const nestedCurrent = `kirsh-vault:${encodeURIComponent(scope + 'tools/')}:other-release`;
  worker.cache(nested);
  worker.cache(nestedCurrent);
  await worker.lifecycle('install');
  await worker.lifecycle('activate');
  expect(worker.stores.has(nested)).toBe(true);
  expect(worker.stores.has(nestedCurrent)).toBe(true);
});
