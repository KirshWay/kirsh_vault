'use client';

import { useEffect } from 'react';

import { registerServiceWorker } from '@/lib/serviceWorker';

export function ServiceWorkerInit() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      registerServiceWorker();
    }
  }, []);

  return null;
}
