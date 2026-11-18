import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import { AdScripts } from "@/components/ad-scripts";
import { AppFrame } from "@/components/app-frame";
import { MobileAnchorAd } from "@/components/mobile-anchor-ad";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { serverAdsConfig } from "@/lib/server/ads-config";
import { siteOrigin } from "@/lib/server/site-url";
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

const origin = siteOrigin();
const ads = serverAdsConfig();

export const metadata: Metadata = {
  ...(origin ? { metadataBase: origin } : {}),
  title: {
    default: "Dragonfire Pit — Copilot for three-dragon teams",
    template: "%s · Dragonfire Pit",
  },
  description:
    "Unofficial Game of Thrones: Dragonfire team coach. Copilot ranks full lines around any dragon, explains synergies and troop affinity, then Team and Pit help you seat them.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "Dragonfire Pit",
    title: "Dragonfire Pit — Copilot for three-dragon teams",
    description:
      "Unofficial Game of Thrones: Dragonfire team coach. Copilot ranks full lines around any dragon, explains synergies and troop affinity, then Team and Pit help you seat them.",
  },
  twitter: {
    card: "summary",
    title: "Dragonfire Pit — Copilot for three-dragon teams",
    description:
      "Unofficial Game of Thrones: Dragonfire team coach. Copilot ranks full lines around any dragon, explains synergies and troop affinity, then Team and Pit help you seat them.",
  },
  appleWebApp: {
    capable: true,
    title: "Dragonfire Pit",
    statusBarStyle: "black-translucent",
  },
  ...(ads.mode === "adsense" && ads.adsenseClient
    ? { other: { "google-adsense-account": ads.adsenseClient } }
    : {}),
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
      <head>
        {ads.mode === "adsense" && ads.adsenseClient ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.adsenseClient)}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body className="flex min-h-full flex-col">
        <Providers ads={ads}>
          <AdScripts />
          <SiteHeader />
          <AppFrame>{children}</AppFrame>
          <MobileAnchorAd />
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
