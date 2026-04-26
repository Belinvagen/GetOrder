import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "GetOrder — Предзаказ еды",
  description: "Платформа предзаказа еды из лучших ресторанов. Закажи заранее — забери без ожидания.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]" suppressHydrationWarning>
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
