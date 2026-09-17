"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { ADMIN_STATUS, ALL_STATUSES } from "@/lib/adminStatus";
import { apiRequest } from "@/lib/apiClient";
import { formatDateTime, formatINR, formatShortDate } from "@/lib/format";
import type { AdminOrderRow, AdminVendorSummary } from "@/types";
import { PageHeader, Pager, setParam, StatusBadge } from "./common";

export function OrdersTable({ fixed }: { fixed?: { vendor?: string } }) {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") ?? "";
  const vendor = fixed?.vendor ?? params.get("vendor") ?? "";
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [search, setSearch] = useState(q);

  const query = new URLSearchParams({ ...(status && { status }), ...(vendor && { vendor }), ...(q && { q }), page: String(page) });
  const orders = useAsync(() => apiRequest<{ orders: AdminOrderRow[]; total: number }>(`/api/admin/orders?${query}`), `orders:${query}`);
  const vendors = useAsync(() => apiRequest<{ vendors: AdminVendorSummary[] }>("/api/admin/vendors"), "vendors-for-filter", { enabled: !fixed?.vendor });

  const go = (key: string, value: string | null) => router.replace(`${window.location.pathname}${setParam(params, key, value)}`);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    go("q", search.trim() || null);
  };

  const selectClass = "h-10 rounded-full border border-line bg-white px-3 text-sm font-medium";

  return (
    <>
      {!fixed && <PageHeader title="Orders" description="Every order on the platform. Search by order ID or customer mobile number." />}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form onSubmit={submit} role="search" className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="KR-10289 or 98200 12345"
            className="h-10 w-full rounded-full border border-line bg-white pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </form>
        <label className="sr-only" htmlFor="status-filter">
          Status
        </label>
        <select id="status-filter" value={status} onChange={(e) => go("status", e.target.value || null)} className={selectClass}>
          <option value="">All statuses</option>
          <option value="open">Open (not finished)</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ADMIN_STATUS[s].label}
            </option>
          ))}
        </select>
        {!fixed?.vendor && (
          <>
            <label className="sr-only" htmlFor="vendor-filter">
              Vendor
            </label>
            <select id="vendor-filter" value={vendor} onChange={(e) => go("vendor", e.target.value || null)} className={selectClass}>
              <option value="">All vendors</option>
              {vendors.data?.vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {orders.status === "error" ? (
        <ErrorState title="Couldn't load orders" message={orders.error ?? ""} onRetry={orders.reload} />
      ) : !orders.data ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : orders.data.orders.length === 0 ? (
        <p className="rounded-3xl border border-line bg-white py-12 text-center text-[15px] text-ink-500">No orders match these filters.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-line bg-white shadow-card">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Order</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Vendor</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Pickup</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.data.orders.map((o) => (
                  <tr key={o.code} className="hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${o.code}`} className="font-mono font-bold text-brand-700 hover:underline">
                        {o.code}
                      </Link>
                      <span className="block text-xs text-ink-400">{formatDateTime(o.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3">
                      {o.customer.id ? (
                        <Link href={`/customers/${o.customer.id}`} className="hover:underline">
                          {o.customer.name}
                        </Link>
                      ) : (
                        o.customer.name
                      )}
                      <span className="block text-xs text-ink-400">{o.area}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/vendors/${o.vendor.id}`} className="hover:underline">
                        {o.vendor.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {formatShortDate(o.pickup.date)}
                      <span className="block text-xs text-ink-400">{o.pickup.slotLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatINR(o.total)}
                      <span className="block text-xs text-ink-400">{o.itemCount} items</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={orders.data.total} onPage={(p) => go("page", String(p))} />
        </>
      )}
    </>
  );
}
