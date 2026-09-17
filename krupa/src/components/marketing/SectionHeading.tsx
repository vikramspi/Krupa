import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionHeadingProps {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}

export function SectionHeading({ id, eyebrow, title, description, align = "left", tone = "light", className }: SectionHeadingProps) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-2xl", className)}>
      <p className={cn("text-xs font-bold uppercase tracking-[0.16em]", tone === "dark" ? "text-brand-300" : "text-brand-600")}>{eyebrow}</p>
      <h2
        id={id}
        className={cn(
          "mt-3 text-balance text-3xl font-bold leading-[1.1] tracking-[-0.035em] sm:text-[2.6rem]",
          tone === "dark" ? "text-white" : "text-ink-950",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-pretty text-lg leading-relaxed", tone === "dark" ? "text-ink-300" : "text-ink-500")}>{description}</p>
      )}
    </div>
  );
}
