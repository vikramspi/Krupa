import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardElement = "div" | "section" | "article" | "aside" | "li";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-5",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function Card({ as: Element = "div", padding = "md", interactive = false, className, ...props }: CardProps) {
  return (
    <Element
      className={cn(
        "rounded-3xl border border-line bg-white shadow-card",
        paddingClasses[padding],
        interactive && "transition-[box-shadow,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:shadow-raised",
        className,
      )}
      {...props}
    />
  );
}
