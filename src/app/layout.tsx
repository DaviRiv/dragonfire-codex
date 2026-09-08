import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import { AdScripts } from "@/components/ad-scripts";
import { AdSlot } from "@/components/ad-slot";
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
    default: "Dragonfire Pit — Team builder for three-dragon lines",
    template: "%s · Dragonfire Pit",
  },
  description:
    "Unofficial Game of Thrones: Dragonfire pit and team tool. Pick a dragon, read community lines and reviews, then build your formation. Copilot is a separate beta chat.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Dragonfire Pit",
    title: "Dragonfire Pit — Team builder for three-dragon lines",
    description:
      "Unofficial Game of Thrones: Dragonfire pit and team tool. Pick a dragon, read community lines and reviews, then build your formation. Copilot is a separate beta chat.",
  },
  twitter: {
    card: "summary",
    title: "Dragonfire Pit — Team builder for three-dragon lines",
    description:
      "Unofficial Game of Thrones: Dragonfire pit and team tool. Pick a dragon, read community lines and reviews, then build your formation. Copilot is a separate beta chat.",
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
          <AdScripts />
          <SiteHeader />
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-3 py-3 sm:px-4 sm:py-6 pb-[calc(9.25rem+env(safe-area-inset-bottom))] lg:pb-8">
            <div className="mb-3">
              <AdSlot slot="billboard" />
            </div>
            <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-4">
              <div className="min-w-0">{children}</div>
              <aside className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] mt-4 hidden space-y-4 xl:block">
                <AdSlot slot="sidebar" />
                <AdSlot slot="sidebar-lower" />
              </aside>
            </div>
          </div>
          <div className="fixed inset-x-0 z-30 lg:hidden bottom-[calc(3.5rem+env(safe-area-inset-bottom))]">
            <div className="border-t border-border/40 bg-background/90 px-2 py-1">
              <AdSlot slot="anchor" />
            </div>
          </div>
          <footer className="hidden border-t border-border/60 px-4 py-6 text-center text-xs text-muted-foreground md:block">
            Fan-made. Not affiliated with HBO, Warner Bros., or Game of
            Thrones: Dragonfire. Ad slots follow a Wowhead-style layout
            (leaderboard, sidebar rectangles, mobile banner) via Google
            Publisher Tag or AdSense when configured; otherwise they show
            house ads for this tool.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
