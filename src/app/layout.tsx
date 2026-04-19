import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from '@/context/ThemeContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UrbanMile - Your Reliable Taxi Service Across India",
  description: "Book professional, reliable taxi rides with UrbanMile. Available 24/7 with transparent pricing and comfortable vehicles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
