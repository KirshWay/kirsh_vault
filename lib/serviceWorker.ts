'use client';

import { Workbox } from 'workbox-window';

import { getBasePath } from './path-utils';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    workbox: any;
  }
}

export function registerServiceWorker() {
  if (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    window.workbox !== undefined
  ) {
    const basePath = getBasePath();
    const wb = new Workbox(`${basePath}/service-worker.js`);

    wb.addEventListener('installed', (event) => {
      console.log('Service Worker installed:', event);
    });

    wb.addEventListener('activated', (event) => {
      console.log('Service Worker activated:', event);
    });

    wb.addEventListener('controlling', (event) => {
      console.log('Service Worker controls the page:', event);
    });

    wb.addEventListener('waiting', (event) => {
      console.log('Service Worker waiting for activation:', event);
    });

    wb.register()
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Error registering Service Worker:', error);
      });

    return wb;
  }

  return null;
}
