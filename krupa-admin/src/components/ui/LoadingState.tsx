import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} aria-hidden="true" />;
}

interface LoadingStateProps {
  title?: string;
  description?: string;
  className?: string;
  /** Renders skeleton rows under the message instead of just a spinner. */
  skeletonRows?: number;
}

export function LoadingState({ title = "Loading…", description, className, skeletonRows = 0 }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center text-center", /\bpy-/.test(className ?? "") ? null : "py-12", className)}
    >
      <Spinner className="size-7 text-brand-600" />
      <p className="mt-4 font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {skeletonRows > 0 && (
        <div className="mt-8 w-full space-y-3">
          {Array.from({ length: skeletonRows }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}
    </div>
  );
}
