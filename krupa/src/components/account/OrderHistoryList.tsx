"use client";

import { ChevronRight, PackageSearch, Star } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { OrderStatusBadge } from "@/components/tracking/OrderStatusBadge";
import { formatINR, formatLongDate, formatRelativeDay } from "@/lib/format";
import { isActiveOrder } from "@/lib/orderStatus";
import { formatDeliveryWindow } from "@/lib/schedule";
import type { Order } from "@/types";
import { ReorderButton } from "./ReorderButton";

export function summarizeLines(order: Order, max = 2): string {
  const parts = order.lines.slice(0, max).map((line) => `${line.quantity} × ${line.name}`);
  const rest = order.lines.length - max;
  return rest > 0 ? `${parts.join(", ")} +${rest} more` : parts.join(", ");
}

export function OrderHistoryList({ orders }: { orders: Order[] }) {
  const active = orders.filter((o) => isActiveOrder(o.status));
  const past = orders.filter((o) => !isActiveOrder(o.status));

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section aria-labelledby="active-orders">
          <h2 id="active-orders" className="flex items-center gap-2 font-bold text-ink-900">
            Active orders <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs text-white">{active.length}</span>
          </h2>
          <ul className="mt-3 space-y-3">
            {active.map((order) => (
              <li key={order.id}>
                <OrderRow order={order} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="past-orders">
        <h2 id="past-orders" className="font-bold text-ink-900">
          Past orders
        </h2>
        {past.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-dashed border-ink-200 px-4 py-6 text-center text-[15px] text-ink-500">
            Completed orders will appear here, ready to reorder in one tap.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {past.map((order) => (
              <li key={order.id}>
                <OrderRow order={order} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function OrderRow({ order }: { order: Order }) {
  const active = isActiveOrder(order.status);
  const titleId = `order-${order.id}`;
  return (
    <article aria-labelledby={titleId} className="rounded-3xl border border-line bg-white p-5 shadow-card transition-shadow hover:shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={titleId} className="font-mono text-[15px] font-bold text-ink-900">
            {order.id}
          </h3>
          <p className="text-sm text-ink-500">
            {order.vendor.name} · {formatLongDate(order.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-3 text-[15px] text-ink-700">{summarizeLines(order)}</p>
      {active && (
        <p className="mt-1 text-sm text-ink-500">
          {order.status === "pickup_scheduled" || order.status === "vendor_assigned" || order.status === "placed"
            ? `Pickup ${formatRelativeDay(order.pickup.date).toLowerCase() === "today" || formatRelativeDay(order.pickup.date).toLowerCase() === "tomorrow" ? formatRelativeDay(order.pickup.date).toLowerCase() : `on ${formatRelativeDay(order.pickup.date)}`}, ${order.pickup.slotLabel}`
            : order.status === "out_for_delivery"
              ? "Out for delivery — arriving soon"
              : `Estimated delivery: ${formatDeliveryWindow(order.estimatedDelivery.from, order.estimatedDelivery.to)}`}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[15px] font-bold tabular-nums text-ink-900">{formatINR(order.pricing.total)}</p>
        <div className="flex flex-wrap items-center gap-2">
          {active ? (
            <ButtonLink href={`/track/${order.id}`} size="sm" leadingIcon={<PackageSearch className="size-4" aria-hidden="true" />}>
              Track<span className="sr-only"> {order.id}</span>
            </ButtonLink>
          ) : (
            <ReorderButton order={order} variant="secondary" />
          )}
          {order.status === "delivered" && (
            <Link
              href={`/account/orders/${order.id}#review-${order.id}`}
              className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
            >
              <Star className="size-4" aria-hidden="true" />
              Rate<span className="sr-only"> {order.vendor.name} for {order.id}</span>
            </Link>
          )}
          <Link
            href={`/account/orders/${order.id}`}
            className="inline-flex h-9 items-center gap-0.5 rounded-full px-3 text-sm font-semibold text-ink-700 hover:bg-ink-100"
          >
            Details<span className="sr-only"> for {order.id}</span>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
