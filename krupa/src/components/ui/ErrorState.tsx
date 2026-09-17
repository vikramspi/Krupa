"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  actions?: ReactNode;
  className?: string;
  /** Compact inline variant for use inside cards and forms. */
  inline?: boolean;
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  actions,
  className,
  inline = false,
}: ErrorStateProps) {
  if (inline) {
    return (
      <div role="alert" className={cn("flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left", className)}>
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-red-900">{title}</p>
          <p className="mt-0.5 text-sm text-red-800">{message}</p>
          {(onRetry || actions) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && (
                <Button size="sm" variant="danger" onClick={onRetry} leadingIcon={<RotateCw className="size-4" aria-hidden="true" />}>
                  {retryLabel}
                </Button>
              )}
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div role="alert" className={cn("flex flex-col items-center px-4 py-12 text-center", className)}>
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600" aria-hidden="true">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="text-lg font-bold tracking-tight text-ink-900">{title}</h2>
      <p className="mt-2 max-w-md text-[15px] text-ink-500">{message}</p>
      {(onRetry || actions) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && (
            <Button onClick={onRetry} leadingIcon={<RotateCw className="size-4" aria-hidden="true" />}>
              {retryLabel}
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
