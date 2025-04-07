import './globals.css';

import { Metadata, Viewport } from 'next';
import { Toaster } from 'react-hot-toast';

import { NavMenu } from '@/components/NavMenu';
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit';
import { DbProvider } from '@/lib/context/DbContext';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#f8f5ed',
};

export const metadata: Metadata = {
  title: 'Kirsh Vault',
  description: 'Your personal collection application',
  manifest: './manifest.json',
  icons: {
    icon: [
      { url: './favicon.ico' },
      { url: './favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: './favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: './apple-touch-icon.png' },
      { url: './apple-touch-icon-120x120.png', sizes: '120x120', type: 'image/png' },
      { url: './apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: './apple-touch-icon-167x167.png', sizes: '167x167', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: './safari-pinned-tab.svg',
        color: '#f8f5ed',
      },
      {
        rel: 'msapplication-TileImage',
        url: './mstile-150x150.png',
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
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'msapplication-TileColor': '#f8f5ed',
    'msapplication-tap-highlight': 'no',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#f8f5ed" />
      </head>
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
