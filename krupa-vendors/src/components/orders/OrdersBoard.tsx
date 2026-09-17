"use client";

import { CalendarClock, ChevronRight, Inbox, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { formatINR, formatRelativeDay, formatShortDate, formatTime } from "@/lib/format";
import { useSession } from "@/state/SessionProvider";
import type { VendorOrder } from "@/types";
import { StatusBadge } from "./StatusBadge";

type Tab = "new" | "active" | "done";
const TABS: { id: Tab; label: string; empty: string }[] = [
  { id: "new", label: "New", empty: "No new orders right now. New bookings appear here for you to accept." },
  { id: "active", label: "In progress", empty: "Nothing in progress. Accepted orders appear here until they're delivered." },
  { id: "done", label: "Completed", empty: "Delivered and cancelled orders will be listed here." },
];
const REFRESH_MS = 30_000;

export function OrdersBoard() {
  const { user } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const tab: Tab = params.get("tab") === "active" || params.get("tab") === "done" ? (params.get("tab") as Tab) : "new";

  const orders = useAsync(
    () => apiRequest<{ orders: VendorOrder[]; counts: Record<Tab, number> }>(`/api/orders?tab=${tab}`),
    `orders:${tab}`,
  );

  // New bookings arrive without the partner doing anything: keep the list fresh.
  const { reload } = orders;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const counts = orders.data?.counts;

  return (
    <Container className="pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink-500">{user?.vendor.name}</p>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        </div>
        <Button variant="outline" size="sm" onClick={reload} leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}>
          Refresh
        </Button>
      </div>

      <div role="tablist" aria-label="Order lists" className="mt-6 flex gap-1.5 overflow-x-auto rounded-2xl bg-ink-100 p-1.5 no-scrollbar">
        {TABS.map((t) => {
          const count = t.id === "done" ? undefined : counts?.[t.id];
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => router.replace(t.id === "new" ? "/orders" : `/orders?tab=${t.id}`)}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold",
                tab === t.id ? "bg-white text-ink-900 shadow-card" : "text-ink-600 hover:text-ink-900",
              )}
            >
              {t.label}
              {count !== undefined && count > 0 && (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", t.id === "new" ? "bg-sun-400 text-ink-950" : "bg-ink-200 text-ink-700")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {orders.status === "error" ? (
          <ErrorState title="Couldn't load orders" message={orders.error ?? ""} onRetry={reload} />
        ) : !orders.data ? (
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-28 rounded-3xl" />
            ))}
          </div>
        ) : orders.data.orders.length === 0 ? (
          <EmptyState icon={<Inbox />} title="All clear" description={TABS.find((t) => t.id === tab)!.empty} className="rounded-3xl border border-line bg-white py-14" />
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {orders.data.orders.map((order) => (
              <li key={order.code}>
                <OrderCard order={order} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}

function OrderCard({ order }: { order: VendorOrder }) {
  const day = formatRelativeDay(order.pickup.date);
  return (
    <Link
      href={`/orders/${order.code}`}
      className={cn(
        "flex h-full items-center gap-4 rounded-3xl border bg-white p-5 shadow-card transition-shadow hover:shadow-raised",
        order.status === "placed" ? "border-sun-300" : "border-line",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-[15px] font-bold">{order.code}</span>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 font-semibold text-ink-900">
          {order.customer.name} · {order.pricing.itemCount} {order.pricing.itemCount === 1 ? "item" : "items"} · {formatINR(order.pricing.total)}
        </p>
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-500">
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-4" aria-hidden="true" />
            {day === "Today" || day === "Tomorrow" ? day : formatShortDate(order.pickup.date)}, {order.pickup.slotLabel}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-4" aria-hidden="true" />
            {order.address.areaName}
          </span>
        </p>
        <p className="mt-1 text-xs text-ink-400">Booked {formatRelativeDay(order.createdAt).toLowerCase()} at {formatTime(order.createdAt)}</p>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-300" aria-hidden="true" />
    </Link>
  );
}
