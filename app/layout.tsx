import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { NavMenu } from "@/components/NavMenu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kirsh Vault",
  description: "Управляйте вашей коллекцией книг, фильмов и предметов.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <NavMenu />
        <main className="py-4">{children}</main>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
