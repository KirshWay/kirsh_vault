'use client';

import { useEffect } from 'react';

import { registerServiceWorker } from '@/lib/serviceWorker';

export function ServiceWorkerInit() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return null;
}
