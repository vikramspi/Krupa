"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/ui/Logo";
import { Spinner } from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";

interface VendorMatchingLoaderProps {
  areaName: string;
}

const STAGE_MS = 900;

/** Branded matching animation shown while nearby partners are ranked. */
export function VendorMatchingLoader({ areaName }: VendorMatchingLoaderProps) {
  const stages = [
    `Looking for partners that serve ${areaName}`,
    "Comparing distance, ratings and turnaround",
    "Checking pickup availability",
  ];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setStage((s) => Math.min(s + 1, stages.length - 1)), STAGE_MS);
    return () => clearInterval(timer);
  }, [stages.length]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center sm:py-16" role="status" aria-live="polite">
      <div className="relative flex size-44 items-center justify-center" aria-hidden="true">
        {[0, 1, 2].map((ring) => (
          <span
            key={ring}
            className="absolute inset-0 rounded-full border-2 border-brand-300/70 animate-radar"
            style={{ animationDelay: `${ring * 0.8}s` }}
          />
        ))}
        <span className="absolute inset-6 rounded-full bg-brand-50" />
        {[
          "left-3 top-8",
          "right-2 top-14",
          "bottom-6 left-10",
          "bottom-10 right-8",
        ].map((position, i) => (
          <span
            key={position}
            className={cn("absolute size-3 rounded-full bg-brand-500 ring-4 ring-white animate-pop", position)}
            style={{ animationDelay: `${0.3 + i * 0.45}s` }}
          />
        ))}
        <LogoMark className="relative size-16 text-brand-600 drop-shadow-md" />
      </div>

      <h1 className="mt-8 text-balance text-2xl font-bold tracking-[-0.03em] text-ink-900 sm:text-[1.75rem]">
        Finding the best laundry partner near you…
      </h1>

      <div className="mt-6 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-brand-500 transition-[width] duration-[900ms] ease-out"
          style={{ width: `${((stage + 1) / stages.length) * 92}%` }}
        />
      </div>

      <ol className="mt-8 w-full space-y-3 text-left">
        {stages.map((label, index) => {
          const state = index < stage ? "done" : index === stage ? "active" : "waiting";
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300",
                state === "waiting" ? "border-transparent opacity-40" : "border-line bg-white shadow-card",
              )}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  state === "done" ? "bg-brand-600 text-white" : "bg-ink-100 text-brand-600",
                )}
              >
                {state === "done" ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : state === "active" ? <Spinner className="size-3.5" /> : null}
              </span>
              <span className={cn("text-[15px]", state === "waiting" ? "text-ink-500" : "font-medium text-ink-800")}>{label}</span>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">{stages[stage]}</p>
    </div>
  );
}
