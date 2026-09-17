import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "sun";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100",
  success: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-100",
  warning: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-100",
  danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-100",
  info: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-100",
  sun: "bg-sun-50 text-sun-700 ring-1 ring-inset ring-sun-100",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: "sm" | "md";
}

export function Badge({ tone = "neutral", size = "sm", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold",
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
