import { afterEach, expect, test, vi } from 'vitest';

import { registerServiceWorker } from './serviceWorker';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

test('a fresh supported browser registers without a Workbox global', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  const register = vi.fn().mockResolvedValue({ scope: '/kirsh_vault/' });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
  await registerServiceWorker();
  expect(register).toHaveBeenCalledWith('/kirsh_vault/service-worker.js', {
    scope: '/kirsh_vault/',
    updateViaCache: 'none',
  });
});

test('development does not install a production service worker', async () => {
  vi.stubEnv('NODE_ENV', 'development');
  const register = vi.fn();
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
  await registerServiceWorker();
  expect(register).not.toHaveBeenCalled();
});
