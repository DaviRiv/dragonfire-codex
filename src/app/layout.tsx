import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import { AdScripts } from "@/components/ad-scripts";
import { AdSlot } from "@/components/ad-slot";
import { AppFrame } from "@/components/app-frame";
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
    "Unofficial Game of Thrones: Dragonfire pit and team tool. Pick one dragon, compare complete lines built around that name, then take one. Copilot is a separate beta chat.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Dragonfire Pit",
    title: "Dragonfire Pit — Team builder for three-dragon lines",
    description:
      "Unofficial Game of Thrones: Dragonfire pit and team tool. Pick one dragon, compare complete lines built around that name, then take one. Copilot is a separate beta chat.",
  },
  twitter: {
    card: "summary",
    title: "Dragonfire Pit — Team builder for three-dragon lines",
    description:
      "Unofficial Game of Thrones: Dragonfire pit and team tool. Pick one dragon, compare complete lines built around that name, then take one. Copilot is a separate beta chat.",
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
          <AppFrame>{children}</AppFrame>
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
