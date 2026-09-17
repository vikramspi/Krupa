import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AdminSessionProvider } from "@/state/AdminSession";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Admin · Krupa Laundry", template: "%s · Krupa admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1019", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="min-h-dvh bg-canvas font-sans text-ink-900 antialiased">
        <AdminSessionProvider>{children}</AdminSessionProvider>
      </body>
    </html>
  );
}
