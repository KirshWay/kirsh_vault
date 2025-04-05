import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DBProvider } from "@/lib/DBContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Kirsh Vault",
  description: "PWA collection manager with offline storage",
  manifest: "./manifest.json",
  applicationName: "Kirsh Vault",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kirsh Vault",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Kirsh Vault",
    title: "Kirsh Vault - Collection Manager",
    description: "PWA collection manager with offline storage",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kirsh Vault",
    description: "PWA collection manager with offline storage",
  },
  icons: {
    icon: [
      { url: "./favicon.ico", sizes: "any" },
      { url: "./favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "./favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "./apple-touch-icon.png",
    other: [
      {
        rel: "mask-icon",
        url: "./icons/android-chrome-192x192.png",
        color: "#000000",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <DBProvider>
          {children}
          <Toaster position="top-center" />
        </DBProvider>
      </body>
    </html>
  );
}
