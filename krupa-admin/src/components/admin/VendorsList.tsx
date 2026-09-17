"use client";

import { Plus, Star } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { formatPhone } from "@/lib/format";
import type { AdminVendorSummary } from "@/types";
import { PageHeader } from "./common";

export function VendorsList() {
  const data = useAsync(() => apiRequest<{ vendors: AdminVendorSummary[] }>("/api/admin/vendors"), "vendors");
  return (
    <>
      <PageHeader
        title="Vendors"
        description="Laundry partners, their coverage, and who can log in to the partner portal."
        actions={
          <ButtonLink href="/vendors/new" leadingIcon={<Plus className="size-4" aria-hidden="true" />}>
            Add vendor
          </ButtonLink>
        }
      />
      {data.status === "error" ? (
        <ErrorState title="Couldn't load vendors" message={data.error ?? ""} onRetry={data.reload} />
      ) : !data.data ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : data.data.vendors.length === 0 ? (
        <p className="rounded-3xl border border-line bg-white py-12 text-center text-ink-500">No vendors yet. Add your first one.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.data.vendors.map((v) => (
            <li key={v.id}>
              <Link href={`/vendors/${v.id}`} className="block h-full rounded-3xl border border-line bg-white p-5 shadow-card hover:shadow-raised">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold">{v.name}</h2>
                  <Badge tone={v.isActive ? "success" : "neutral"}>{v.isActive ? "Taking orders" : "Paused"}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink-500">{formatPhone(v.contactPhone)}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-ink-500">Open orders</dt>
                    <dd className="font-semibold">{v.openOrders} <span className="font-normal text-ink-400">/ {v.totalOrders} total</span></dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Reviews</dt>
                    <dd className="flex items-center gap-1 font-semibold">
                      {v.reviewAverage !== null ? (
                        <>
                          <Star className="size-3.5 text-sun-400" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                          {v.reviewAverage.toFixed(1)} <span className="font-normal text-ink-400">({v.reviewCount})</span>
                        </>
                      ) : (
                        <span className="font-normal text-ink-400">None yet</span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Areas</dt>
                    <dd className="font-semibold">{v.coverageAreas.length}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-500">Portal logins</dt>
                    <dd className={v.logins === 0 ? "font-semibold text-sun-700" : "font-semibold"}>{v.logins === 0 ? "None — add one" : v.logins}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
