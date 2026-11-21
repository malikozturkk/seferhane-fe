import type { Metadata } from "next";
import { DM_Sans, Inter } from "next/font/google";
import "./globals.css";

/* Design system fonts: Inter (UI) + DM Sans (brand wordmark). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Seferhane",
  description: "Seferhane",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
