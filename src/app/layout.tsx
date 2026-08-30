import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dragonfire — Build a line",
  description:
    "Unofficial Game of Thrones: Dragonfire tool. Pick a troop and a lane, then tap suggested dragons into formation.",
  icons: { icon: "/favicon.svg" },
  appleWebApp: {
    capable: true,
    title: "Dragonfire",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2a1c12",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8">
            {children}
          </main>
          <footer className="border-t border-border/60 px-4 py-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground md:pb-6">
            Fan-made. Not affiliated with HBO, Warner Bros., or Game of
            Thrones: Dragonfire.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
