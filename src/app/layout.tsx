import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
      <body className="flex min-h-full flex-col">
        <Providers ads={ads}>
          {ads.mode === "adsense" && ads.adsenseClient ? (
            <Script
              id="adsense"
              async
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.adsenseClient)}`}
              crossOrigin="anonymous"
              strategy="afterInteractive"
            />
          ) : null}
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
