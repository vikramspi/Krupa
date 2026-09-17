"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface ProgressStep {
  id: string;
  label: string;
  href: string;
  /** Whether the customer can jump to this step. */
  reachable: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentId: string;
  className?: string;
}

/**
 * Booking progress: Location → Vendor → Services → Pickup → Review.
 * Completed steps are links so customers can go back and edit.
 */
export function ProgressIndicator({ steps, currentId, className }: ProgressIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentId);

  return (
    <nav aria-label="Booking progress" className={className}>
      <p className="sr-only">
        Step {currentIndex + 1} of {steps.length}: {steps[currentIndex]?.label}
      </p>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const state = index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          const clickable = state !== "current" && step.reachable;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200",
                  state === "complete" && "bg-brand-600 text-white",
                  state === "current" && "bg-ink-900 text-white ring-4 ring-brand-100",
                  state === "upcoming" && "border border-ink-200 bg-white text-ink-500",
                )}
                aria-hidden="true"
              >
                {state === "complete" ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-semibold sm:inline",
                  state === "current" ? "text-ink-900" : state === "complete" ? "text-ink-700" : "text-ink-400",
                )}
              >
                {step.label}
              </span>
              <span className="sr-only">
                {step.label}
                {state === "complete" ? " (completed)" : state === "upcoming" ? " (not started)" : ""}
              </span>
            </>
          );

          return (
            <li key={step.id} className={cn("flex items-center", index < steps.length - 1 && "flex-1")}>
              {clickable ? (
                <Link href={step.href} className="flex items-center gap-2 rounded-full pr-1 hover:opacity-80">
                  {content}
                </Link>
              ) : (
                <span className="flex items-center gap-2 pr-1" aria-current={state === "current" ? "step" : undefined}>
                  {content}
                </span>
              )}
              {index < steps.length - 1 && (
                <span
                  className={cn("mx-2 h-0.5 flex-1 rounded-full sm:mx-3", index < currentIndex ? "bg-brand-500" : "bg-ink-200")}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
