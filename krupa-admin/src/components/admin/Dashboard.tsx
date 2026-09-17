"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { formatINR, formatRelativeDay, formatShortDate, formatTime } from "@/lib/format";
import type { ActivityItem, AdminOrderRow, DashboardStats } from "@/types";
import { ActivityList, PageHeader, Panel, StatCard, StatusBadge } from "./common";

interface Data {
  stats: DashboardStats;
  waiting: AdminOrderRow[];
  activity: ActivityItem[];
}

export function Dashboard() {
  const data = useAsync(() => apiRequest<Data>("/api/admin/stats"), "dashboard");
  const { reload } = data;
  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), 60_000);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Everything happening across the customer website and partner portal."
        actions={
          <Button variant="outline" size="sm" onClick={reload} leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}>
            Refresh
          </Button>
        }
      />
      {data.status === "error" ? (
        <ErrorState title="Couldn't load the dashboard" message={data.error ?? ""} onRetry={reload} />
      ) : !data.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      ) : (
        <Body data={data.data} />
      )}
    </>
  );
}

function Body({ data }: { data: Data }) {
  const { stats } = data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Awaiting partner"
          value={stats.awaitingPartner}
          hint={stats.staleAwaiting ? `${stats.staleAwaiting} waiting over 30 min` : "None overdue"}
          tone={stats.staleAwaiting ? "warning" : "neutral"}
          href="/orders?status=placed"
        />
        <StatCard label="In progress" value={stats.inProgress} hint="Accepted, not yet delivered" href="/orders?status=open" />
        <StatCard label="Orders today" value={stats.ordersToday} href="/orders" />
        <StatCard label="Delivered · 7 days" value={stats.deliveredLast7Days} hint={`${formatINR(stats.revenueLast7Days)} collected by partners`} href="/orders?status=delivered" />
        <StatCard label="Customers" value={stats.customers} hint={`${stats.newCustomersLast7Days} new this week`} href="/customers" />
        <StatCard label="Vendors taking orders" value={`${stats.activeVendors} / ${stats.totalVendors}`} href="/vendors" />
        <StatCard label="Review average" value={stats.reviewAverage?.toFixed(1) ?? "—"} hint={`${stats.reviewCount} published`} href="/reviews" />
        <div className="flex flex-col justify-center gap-2 rounded-3xl border border-dashed border-ink-200 p-5">
          <ButtonLink href="/vendors/new" size="sm">
            Add a vendor
          </ButtonLink>
          <ButtonLink href="/activity" size="sm" variant="outline">
            Full activity log
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Waiting for a partner" action={<Link href="/orders?status=placed" className="text-sm font-semibold text-brand-700">View all</Link>}>
          {data.waiting.length === 0 ? (
            <p className="py-6 text-center text-[15px] text-ink-500">No orders waiting. </p>
          ) : (
            <ul className="divide-y divide-line">
              {data.waiting.map((order) => (
                <li key={order.code}>
                  <Link href={`/orders/${order.code}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-ink-50">
                    <span className="min-w-0">
                      <span className="font-mono font-bold">{order.code}</span>
                      <span className="block text-sm text-ink-500">
                        {order.vendor.name} · {order.area} · pickup {formatRelativeDay(order.pickup.date) === "Today" ? "today" : formatShortDate(order.pickup.date)}
                      </span>
                    </span>
                    <span className="text-right text-sm text-ink-500">
                      <StatusBadge status={order.status} />
                      <span className="mt-1 block">booked {formatTime(order.createdAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Latest activity" action={<Link href="/activity" className="text-sm font-semibold text-brand-700">View all</Link>}>
          <ActivityList items={data.activity} />
        </Panel>
      </div>
    </div>
  );
}
