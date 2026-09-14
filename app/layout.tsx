import './globals.css';

import { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

import { NavMenu } from '@/components/NavMenu';
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit';
import { BASE_PATH } from '@/lib/config/site.mjs';
import { DbProvider } from '@/lib/context/DbContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8f5ed',
};

export const metadata: Metadata = {
  title: 'Kirsh Vault',
  description: 'Your personal collection application',
  manifest: `${BASE_PATH}/manifest.json`,
  icons: {
    icon: [
      { url: `${BASE_PATH}/favicon.ico` },
      { url: `${BASE_PATH}/favicon-16x16.png`, sizes: '16x16', type: 'image/png' },
      { url: `${BASE_PATH}/favicon-32x32.png`, sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: `${BASE_PATH}/apple-touch-icon.png` },
      { url: `${BASE_PATH}/apple-touch-icon-120x120.png`, sizes: '120x120', type: 'image/png' },
      { url: `${BASE_PATH}/apple-touch-icon-152x152.png`, sizes: '152x152', type: 'image/png' },
      { url: `${BASE_PATH}/apple-touch-icon-167x167.png`, sizes: '167x167', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: `${BASE_PATH}/safari-pinned-tab.svg`,
        color: '#f8f5ed',
      },
      {
        rel: 'msapplication-TileImage',
        url: `${BASE_PATH}/mstile-150x150.png`,
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'Kirsh Vault',
    statusBarStyle: 'default',
  },
  applicationName: 'Kirsh Vault',
  formatDetection: {
    telephone: false,
  },
  other: {
    'msapplication-TileColor': '#f8f5ed',
    'msapplication-tap-highlight': 'no',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DbProvider>
          <NavMenu />
          {children}
          <Toaster position="bottom-right" />
          <ServiceWorkerInit />
        </DbProvider>
      </body>
    </html>
  );
}
