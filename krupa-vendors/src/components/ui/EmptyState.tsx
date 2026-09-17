import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  tone?: "neutral" | "brand" | "sun";
  headingLevel?: "h2" | "h3";
}

const toneClasses = {
  neutral: "bg-ink-100 text-ink-600",
  brand: "bg-brand-50 text-brand-700",
  sun: "bg-sun-50 text-sun-700",
};

export function EmptyState({ icon, title, description, actions, className, tone = "neutral", headingLevel: Heading = "h2" }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-4 text-center", /\bpy-/.test(className ?? "") ? null : "py-10", className)}>
      {icon && (
        <div className={cn("mb-5 flex size-14 items-center justify-center rounded-2xl [&_svg]:size-6", toneClasses[tone])} aria-hidden="true">
          {icon}
        </div>
      )}
      <Heading className="text-balance text-lg font-bold tracking-tight text-ink-900">{title}</Heading>
      {description && <div className="mt-2 max-w-md text-balance text-[15px] leading-relaxed text-ink-500">{description}</div>}
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}
