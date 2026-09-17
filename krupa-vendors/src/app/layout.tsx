import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { SessionProvider } from "@/state/SessionProvider";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Partner portal · Krupa Laundry", template: "%s · Krupa Laundry partners" },
  description: "Krupa Laundry partner portal — manage your laundry orders.",
  // Private tool: keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#117064", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="min-h-dvh bg-canvas font-sans text-ink-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
