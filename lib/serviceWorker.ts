'use client';

import { PRODUCTION_BASE_PATH } from './config/site.mjs';

export async function registerServiceWorker() {
  if (
    process.env.NODE_ENV !== 'production' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  )
    return;
  try {
    return await navigator.serviceWorker.register(`${PRODUCTION_BASE_PATH}/service-worker.js`, {
      scope: `${PRODUCTION_BASE_PATH}/`,
      updateViaCache: 'none',
    });
  } catch (error) {
    console.warn('Offline support could not be installed:', error);
  }
}
