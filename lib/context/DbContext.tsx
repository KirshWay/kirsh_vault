'use client';

import { createContext, type ReactNode, useContext, useEffect } from 'react';

import { cleanupAbandonedBackups } from '@/lib/backup/session';
import db, { type AppDatabase } from '@/lib/db';

const DbContext = createContext<AppDatabase | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void cleanupAbandonedBackups(db).catch(() => {});
  }, []);
  return <DbContext.Provider value={db}>{children}</DbContext.Provider>;
}

export function useDb() {
  const context = useContext(DbContext);
  if (!context) throw new Error('useDb must be used within a DbProvider');
  return context;
}
