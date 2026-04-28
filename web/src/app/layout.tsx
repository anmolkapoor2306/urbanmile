import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: "UrbanMiles - Your Reliable Taxi Service Across India",
  description: "Book professional, reliable taxi rides with UrbanMile. Available 24/7 with transparent pricing and comfortable vehicles.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html
        lang="en"
        className="h-full antialiased"
      >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
