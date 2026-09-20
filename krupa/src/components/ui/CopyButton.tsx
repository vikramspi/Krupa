"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          // Clipboard can be blocked (e.g. insecure context); fall back to selecting nothing.
        }
      }}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-emerald-600" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}
