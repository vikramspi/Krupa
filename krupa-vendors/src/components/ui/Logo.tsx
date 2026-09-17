import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden="true">
      <rect width="64" height="64" rx="18" fill="currentColor" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="white" strokeWidth="5" />
      <path d="M19.5 34.5c4.2-3.4 8.3-3.4 12.5 0s8.3 3.4 12.5 0" fill="none" stroke="#a2dcd2" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

interface LogoProps {
  className?: string;
  tone?: "dark" | "light";
  href?: string;
}

/** Krupa Laundry wordmark. */
export function Logo({ className, tone = "dark", href = "/" }: LogoProps) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2.5 rounded-lg", className)} aria-label="Krupa Laundry — home">
      <LogoMark className={cn("size-8 transition-transform duration-300 group-hover:rotate-[-8deg]", tone === "dark" ? "text-brand-600" : "text-brand-500")} />
      <span className="flex items-baseline gap-1 leading-none">
        <span className={cn("text-[1.2rem] font-extrabold tracking-[-0.04em]", tone === "dark" ? "text-ink-900" : "text-white")}>krupa</span>
        <span className={cn("text-[0.7rem] font-semibold uppercase tracking-[0.18em]", tone === "dark" ? "text-brand-600" : "text-brand-300")}>
          laundry
        </span>
      </span>
    </Link>
  );
}
