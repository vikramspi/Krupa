"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/reportError";

/** Last-resort boundary: replaces the whole document, so it ships its own html/body. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest, fatal: true });
  }, [error]);

  return (
    <html lang="en-IN">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f6f2", color: "#141b27", margin: 0 }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Something went wrong</h1>
          <p style={{ color: "#435063", lineHeight: 1.6 }}>
            Sorry — Krupa Laundry hit an unexpected error. Please try again, or call us and we&apos;ll book your pickup
            over the phone.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              background: "#117064",
              color: "#fff",
              border: 0,
              borderRadius: 999,
              padding: "14px 28px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
