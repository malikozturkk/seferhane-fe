import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Inter } from "next/font/google";
import { Providers } from "@/app-shell/Providers";
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
  description: "Sefer planından kâra kadar, lojistiğin tamamı tek ekranda.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="tr"
      className={`${inter.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
