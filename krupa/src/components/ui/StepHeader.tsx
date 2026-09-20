import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface StepHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Page heading for each booking step. Receives focus-independent, semantic <h1>. */
export function StepHeader({ eyebrow, title, description, action, className }: StepHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="font-mono text-[13px] text-brand-700">{eyebrow}</p>}
        <h1 className="mt-1.5 text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] text-ink-900 sm:text-[2.1rem]">
          {title}
        </h1>
        {description && <div className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-500 sm:text-base">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
