"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { formatINR, formatLongDate, formatPhone, formatShortDate } from "@/lib/format";
import type { ActivityItem, AdminCustomerRow, AdminOrderRow } from "@/types";
import { ActivityList, PageHeader, Panel, StatusBadge } from "./common";

interface Data {
  customer: AdminCustomerRow & { addresses: number };
  orders: AdminOrderRow[];
  activity: ActivityItem[];
}

export function CustomerDetail({ id }: { id: string }) {
  const data = useAsync(() => apiRequest<Data>(`/api/admin/customers/${id}`), `customer:${id}`);
  if (data.status === "error") return <ErrorState title="Couldn't load this customer" message={data.error ?? ""} onRetry={data.reload} />;
  if (!data.data) return <LoadingState className="py-24" />;
  const { customer, orders, activity } = data.data;
  const spent = orders.filter((o) => o.status === "delivered").reduce((sum, o) => sum + o.total, 0);

  return (
    <>
      <Link href="/customers" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Customers
      </Link>
      <PageHeader title={customer.name || "Unnamed customer"} description={`Joined ${formatLongDate(customer.createdAt)}`} />
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Profile">
          <dl className="space-y-3 text-[15px]">
            <div>
              <dt className="text-sm text-ink-500">Mobile</dt>
              <dd>{customer.phone ? <a className="text-brand-700 hover:underline" href={`tel:+91${customer.phone}`}>{formatPhone(customer.phone)}</a> : "Not verified yet"}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-500">Email</dt>
              <dd>
                {customer.email ?? "—"}
                {customer.email && <span className="ml-2 text-sm text-ink-500">({customer.emailVerified ? "confirmed" : "unconfirmed"})</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-500">Sign-in methods</dt>
              <dd>{[customer.phone && "SMS code", customer.email && "Email", customer.google && "Google"].filter(Boolean).join(" · ") || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-500">Orders · delivered value</dt>
              <dd>
                {customer.orderCount} · {formatINR(spent)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-500">Saved addresses</dt>
              <dd>{customer.addresses}</dd>
            </div>
          </dl>
        </Panel>
        <div className="space-y-6">
          <Panel title="Orders">
            {orders.length === 0 ? (
              <p className="py-4 text-center text-ink-500">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {orders.map((o) => (
                  <li key={o.code}>
                    <Link href={`/orders/${o.code}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:bg-ink-50">
                      <span>
                        <span className="font-mono font-bold">{o.code}</span>
                        <span className="block text-sm text-ink-500">
                          {o.vendor.name} · pickup {formatShortDate(o.pickup.date)} · {formatINR(o.total)}
                        </span>
                      </span>
                      <StatusBadge status={o.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Account activity">
            <ActivityList items={activity} empty="No account activity logged." />
          </Panel>
        </div>
      </div>
    </>
  );
}
