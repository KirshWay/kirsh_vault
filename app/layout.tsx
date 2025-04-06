import './globals.css';

import { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';

import { NavMenu } from '@/components/NavMenu';
import { DbProvider } from '@/lib/context/DbContext';

export const metadata: Metadata = {
  title: 'Kirsh Vault',
  description: 'Your personal collection application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DbProvider>
          <NavMenu />
          {children}
          <Toaster position="bottom-right" />
        </DbProvider>
      </body>
    </html>
  );
}
