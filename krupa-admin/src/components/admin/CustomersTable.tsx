"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { formatLongDate, formatPhone } from "@/lib/format";
import type { AdminCustomerRow } from "@/types";
import { PageHeader, Pager, setParam } from "./common";

export function CustomersTable() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q") ?? "";
  const page = Number(params.get("page")) || 1;
  const [search, setSearch] = useState(q);
  const query = new URLSearchParams({ ...(q && { q }), page: String(page) });
  const data = useAsync(() => apiRequest<{ customers: AdminCustomerRow[]; total: number }>(`/api/admin/customers?${query}`), `customers:${query}`);
  const go = (key: string, value: string | null) => router.replace(`/customers${setParam(params, key, value)}`);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    go("q", search.trim() || null);
  };

  return (
    <>
      <PageHeader title="Customers" description="Everyone with an account on the customer website." />
      <form onSubmit={submit} role="search" className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <label htmlFor="customer-search" className="sr-only">
          Search customers
        </label>
        <input
          id="customer-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email or mobile"
          className="h-10 w-full rounded-full border border-line bg-white pl-9 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
      </form>
      {data.status === "error" ? (
        <ErrorState title="Couldn't load customers" message={data.error ?? ""} onRetry={data.reload} />
      ) : !data.data ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : data.data.customers.length === 0 ? (
        <p className="rounded-3xl border border-line bg-white py-12 text-center text-ink-500">No customers match.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-3xl border border-line bg-white shadow-card">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-line bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Customer</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Mobile</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Email</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Orders</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.data.customers.map((c) => (
                  <tr key={c.id} className="hover:bg-ink-50">
                    <td className="px-4 py-3">
                      <Link href={`/customers/${c.id}`} className="font-semibold text-brand-700 hover:underline">
                        {c.name || "Unnamed"}
                      </Link>
                      {c.google && <Badge tone="info" className="ml-2">Google</Badge>}
                    </td>
                    <td className="px-4 py-3">{c.phone ? formatPhone(c.phone) : <span className="text-ink-400">Not verified</span>}</td>
                    <td className="px-4 py-3">
                      {c.email ?? <span className="text-ink-400">—</span>}
                      {c.email && !c.emailVerified && <span className="block text-xs text-sun-700">Unconfirmed</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.orderCount}</td>
                    <td className="px-4 py-3">{formatLongDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} total={data.data.total} onPage={(p) => go("page", String(p))} />
        </>
      )}
    </>
  );
}
