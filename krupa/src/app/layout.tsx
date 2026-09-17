import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { Analytics } from "@/components/analytics/Analytics";
import { siteConfig } from "@/lib/config";
import { SessionProvider } from "@/state/SessionProvider";
import { StoreHydration } from "@/state/hydration";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

const description =
  "Book a doorstep laundry pickup in Mumbai. Krupa Laundry matches you with a trusted local laundry partner, shows transparent prices upfront and tracks your order end-to-end.";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: "Krupa Laundry — Laundry pickup & delivery in Mumbai",
    template: "%s · Krupa Laundry",
  },
  description,
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: "Krupa Laundry — Laundry pickup & delivery in Mumbai",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Krupa Laundry — Laundry pickup & delivery in Mumbai",
    description,
  },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#117064",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${instrument.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Skip to main content
        </a>
        <StoreHydration />
        <SessionProvider>{children}</SessionProvider>
        <Analytics />
      </body>
    </html>
  );
}
