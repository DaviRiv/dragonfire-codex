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
  title: {
    default: "Dragonfire Pit — Pick a three-dragon team",
    template: "%s · Dragonfire Pit",
  },
  description:
    "Unofficial Game of Thrones: Dragonfire pit and team tool. Log dragons, rank a three-dragon line, and read kit, troop affinity, and what survives a Reign.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Dragonfire Pit",
    title: "Dragonfire Pit — Pick a three-dragon team",
    description:
      "Unofficial Game of Thrones: Dragonfire pit and team tool. Log dragons, rank a three-dragon line, and read kit, troop affinity, and what survives a Reign.",
  },
  twitter: {
    card: "summary",
    title: "Dragonfire Pit — Pick a three-dragon team",
    description:
      "Unofficial Game of Thrones: Dragonfire pit and team tool. Log dragons, rank a three-dragon line, and read kit, troop affinity, and what survives a Reign.",
  },
  appleWebApp: {
    capable: true,
    title: "Dragonfire Pit",
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
          <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-3 sm:px-4 sm:py-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-8">
            {children}
          </main>
          <footer className="hidden border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground md:block">
            Fan-made. Not affiliated with HBO, Warner Bros., or Game of
            Thrones: Dragonfire.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
