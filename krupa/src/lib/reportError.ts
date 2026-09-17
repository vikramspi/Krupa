/**
 * Error reporting seam.
 *
 * Always logs. If Sentry is loaded (set NEXT_PUBLIC_SENTRY_DSN and add @sentry/nextjs),
 * the error is forwarded to it too — no other call site needs to change.
 */
interface SentryLike {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
}

export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  console.error("[krupa]", error, context);

  if (typeof window !== "undefined") {
    const sentry = (window as unknown as { Sentry?: SentryLike }).Sentry;
    sentry?.captureException(error, { extra: context });
  }
}
