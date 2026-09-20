import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, formatRelativeDay, formatShortDate } from "@/lib/format";
import { ORDER_STATUS_META, ORDER_STATUS_SEQUENCE, statusIndex, statusMeta } from "@/lib/orderStatus";
import type { Order, OrderStatus } from "@/types";

interface OrderTrackingTimelineProps {
  order: Order;
  /** Tighter spacing and no descriptions, for order-history detail. */
  compact?: boolean;
}

function expectedHint(status: OrderStatus, order: Order): string | null {
  if (status === "picked_up") {
    const day = formatRelativeDay(order.pickup.date);
    return `Expected ${day === "Today" || day === "Tomorrow" ? day.toLowerCase() : day}, ${order.pickup.slotLabel}`;
  }
  if (status === "delivered") return `Expected by ${formatShortDate(order.estimatedDelivery.to)}`;
  return null;
}

export function OrderTrackingTimeline({ order, compact = false }: OrderTrackingTimelineProps) {
  if (order.status === "cancelled") return <CancelledTimeline order={order} compact={compact} />;
  const events = new Map(order.statusHistory.map((event) => [event.status, event]));
  const currentIndex = statusIndex(order.status);

  return (
    <ol className="relative" aria-label="Order progress">
      {ORDER_STATUS_SEQUENCE.map((status, index) => {
        const meta = ORDER_STATUS_META[status];
        const event = events.get(status);
        const isLast = index === ORDER_STATUS_SEQUENCE.length - 1;
        const state =
          index < currentIndex || (index === currentIndex && status === "delivered")
            ? "done"
            : index === currentIndex
              ? "current"
              : "upcoming";
        const hint = state === "upcoming" ? expectedHint(status, order) : null;

        return (
          <li
            key={status}
            aria-current={state === "current" ? "step" : undefined}
            className={cn("relative flex gap-4", !isLast && (compact ? "pb-4" : "pb-6"))}
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[11px] top-8 w-px",
                  compact ? "h-[calc(100%-22px)]" : "h-[calc(100%-26px)]",
                  index < currentIndex ? "bg-brand-400" : "bg-ink-200",
                )}
              />
            )}
            {/* A peg on the line: filled once done, open while still ahead. */}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-0.5 flex h-7 w-6 shrink-0 -rotate-6 items-start justify-center rounded-t-full rounded-b-sm border-2 pt-1",
                state === "done" && "border-brand-600 bg-brand-600 text-white",
                state === "current" && "border-brand-600 bg-white text-brand-600",
                state === "upcoming" && "border-ink-200 bg-white",
              )}
            >
              {state === "done" && <Check className="size-3.5" strokeWidth={3} />}
              {state === "current" && <span className="size-2 rounded-full bg-brand-600" />}
              {/* the peg's spring */}
              <span className={cn("absolute inset-x-1 top-3 h-px", state === "upcoming" ? "bg-ink-200" : state === "done" ? "bg-white/50" : "bg-brand-300")} />
            </span>

            <div className={cn("min-w-0 flex-1", compact ? "pt-0.5" : "pt-0.5")}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p
                  className={cn(
                    "font-semibold",
                    state === "upcoming" ? "text-ink-400" : "text-ink-900",
                    state === "current" && !compact && "text-lg tracking-tight",
                  )}
                >
                  <span className="sr-only">{state === "done" ? "Completed: " : state === "current" ? "Current step: " : "Upcoming: "}</span>
                  {meta.label}
                </p>
                {event && state !== "upcoming" && (
                  <time dateTime={event.at} className="text-sm tabular-nums text-ink-500">
                    {formatDateTime(event.at)}
                  </time>
                )}
              </div>
              {state === "current" && !compact && <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{meta.description}</p>}
              {event?.note && state !== "upcoming" && !compact && <p className="mt-0.5 text-sm text-ink-500">{event.note}</p>}
              {hint && <p className="mt-0.5 text-sm text-ink-400">{hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** A cancelled order shows only what actually happened, ending in the cancellation. */
function CancelledTimeline({ order, compact }: { order: Order; compact: boolean }) {
  return (
    <ol className="relative" aria-label="Order history">
      {order.statusHistory.map((event, index) => {
        const isLast = index === order.statusHistory.length - 1;
        const cancelled = event.status === "cancelled";
        return (
          <li key={`${event.status}-${event.at}`} className={cn("relative flex gap-4", !isLast && (compact ? "pb-4" : "pb-6"))}>
            {!isLast && <span aria-hidden="true" className="absolute left-[11px] top-8 h-[calc(100%-26px)] w-px bg-ink-200" />}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-10 mt-0.5 flex h-7 w-6 shrink-0 -rotate-6 items-start justify-center rounded-t-full rounded-b-sm pt-1 text-white",
                cancelled ? "bg-ink-500" : "bg-brand-600",
              )}
            >
              {cancelled ? <X className="size-4" strokeWidth={3} /> : <Check className="size-4" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="font-semibold text-ink-900">{statusMeta(event.status).label}</p>
                <time dateTime={event.at} className="text-sm tabular-nums text-ink-500">
                  {formatDateTime(event.at)}
                </time>
              </div>
              {event.note && !compact && <p className="mt-0.5 text-sm text-ink-500">{event.note}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
