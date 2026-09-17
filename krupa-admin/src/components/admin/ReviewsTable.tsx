"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { RatingStars } from "@/components/ui/RatingStars";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/format";
import type { AdminReview } from "@/types";
import { PageHeader, Pager, setParam } from "./common";

export function ReviewsTable() {
  const params = useSearchParams();
  const router = useRouter();
  const hidden = params.get("hidden") === "1";
  const page = Number(params.get("page")) || 1;
  const query = new URLSearchParams({ ...(hidden && { hidden: "1" }), page: String(page) });
  const data = useAsync(() => apiRequest<{ reviews: AdminReview[]; total: number }>(`/api/admin/reviews?${query}`), `reviews:${query}`);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const go = (key: string, value: string | null) => router.replace(`/reviews${setParam(params, key, value)}`);

  const toggle = async (review: AdminReview) => {
    setBusy(review.id);
    setError(null);
    try {
      await apiRequest(`/api/admin/reviews/${review.id}`, { method: "PATCH", body: JSON.stringify({ isPublished: !review.isPublished }) });
      data.reload();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Reviews"
        description="Customer reviews of vendors. Hidden reviews don't appear publicly or count towards ratings."
        actions={
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={hidden} onChange={(e) => go("hidden", e.target.checked ? "1" : null)} className="size-4 accent-brand-600" />
            Hidden only
          </label>
        }
      />
      {error && <p role="alert" className="mb-3 text-sm font-semibold text-red-700">{error}</p>}
      {data.status === "error" ? (
        <ErrorState title="Couldn't load reviews" message={data.error ?? ""} onRetry={data.reload} />
      ) : !data.data ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : data.data.reviews.length === 0 ? (
        <p className="rounded-3xl border border-line bg-white py-12 text-center text-ink-500">{hidden ? "No hidden reviews." : "No reviews yet."}</p>
      ) : (
        <>
          <ul className="space-y-3">
            {data.data.reviews.map((r) => (
              <li key={r.id} className="rounded-3xl border border-line bg-white p-5 shadow-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={r.rating} />
                      {!r.isPublished && <Badge tone="warning">Hidden</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      <Link href={`/customers/${r.customer.id}`} className="hover:underline">
                        {r.customer.name ?? "Customer"}
                      </Link>{" "}
                      on{" "}
                      <Link href={`/vendors/${r.vendor.id}`} className="font-semibold hover:underline">
                        {r.vendor.name}
                      </Link>
                      {r.orderCode && (
                        <>
                          {" "}·{" "}
                          <Link href={`/orders/${r.orderCode}`} className="font-mono hover:underline">
                            {r.orderCode}
                          </Link>
                        </>
                      )}{" "}
                      · {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <Button size="sm" variant={r.isPublished ? "outline" : "primary"} loading={busy === r.id} loadingText="Saving…" onClick={() => void toggle(r)}>
                    {r.isPublished ? "Hide" : "Publish"}
                  </Button>
                </div>
                {r.comment && <p className="mt-3 whitespace-pre-line break-words text-[15px] text-ink-700">{r.comment}</p>}
              </li>
            ))}
          </ul>
          <Pager page={page} total={data.data.total} onPage={(p) => go("page", String(p))} />
        </>
      )}
    </>
  );
}
