"use client";

import { MessageSquareQuote } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { RatingStars } from "@/components/ui/RatingStars";
import { useAsync } from "@/hooks/useAsync";
import { getErrorMessage } from "@/lib/errors";
import { formatLongDate, pluralize } from "@/lib/format";
import { vendorService } from "@/services";
import type { VendorReview } from "@/types";

/** A partner's published reviews: summary, star breakdown and a paged list. */
export function VendorReviews({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const first = useAsync(() => vendorService.getVendorReviews(vendorId), `reviews:${vendorId}`);
  const [more, setMore] = useState<{ reviews: VendorReview[]; nextOffset: number | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  if (first.status === "loading" || first.status === "idle") {
    return (
      <div className="mt-3 space-y-3" aria-hidden="true">
        <Skeleton className="h-20" />
        <Skeleton className="h-16" />
      </div>
    );
  }
  if (first.status === "error" || !first.data) {
    return <ErrorState inline className="mt-3" title="Couldn't load reviews" message={first.error ?? ""} onRetry={first.reload} />;
  }

  const { summary } = first.data;
  const reviews = [...first.data.reviews, ...(more?.reviews ?? [])];
  const nextOffset = more ? more.nextOffset : first.data.nextOffset;

  if (summary.count === 0) {
    return (
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-ink-50 p-4 text-[15px] text-ink-600">
        <MessageSquareQuote className="mt-0.5 size-5 shrink-0 text-ink-400" aria-hidden="true" />
        <p>
          No reviews for {vendorName} yet. Reviews come only from customers whose orders were delivered by this partner.
        </p>
      </div>
    );
  }

  const loadMore = async () => {
    if (nextOffset === null) return;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await vendorService.getVendorReviews(vendorId, nextOffset);
      setMore((prev) => ({ reviews: [...(prev?.reviews ?? []), ...page.reviews], nextOffset: page.nextOffset }));
    } catch (error) {
      setMoreError(getErrorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-5 rounded-2xl border border-line p-4">
        <div className="text-center">
          <p className="text-3xl font-bold tracking-tight text-ink-900">{summary.average?.toFixed(1)}</p>
          <RatingStars rating={summary.average} className="mt-1" />
          <p className="mt-1 text-xs text-ink-500">{pluralize(summary.count, "review")}</p>
        </div>
        <ul className="min-w-0 flex-1 space-y-1" aria-label="Rating breakdown">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star - 1];
            const percent = Math.round((count / summary.count) * 100);
            return (
              <li key={star} className="flex items-center gap-2 text-xs text-ink-600">
                <span className="w-3 text-right tabular-nums" aria-hidden="true">
                  {star}
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
                  <span className="block h-full rounded-full bg-sun-400" style={{ width: `${percent}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums" aria-hidden="true">
                  {count}
                </span>
                <span className="sr-only">
                  {pluralize(count, "review")} with {star} {star === 1 ? "star" : "stars"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <ul className="mt-4 divide-y divide-line">
        {reviews.map((review) => (
          <li key={review.id} className="py-4 first:pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-ink-900">{review.authorName}</p>
              <RatingStars rating={review.rating} />
            </div>
            <p className="mt-0.5 font-mono text-[12px] text-ink-500">
              Verified order, {formatLongDate(review.createdAt)}
              {review.edited && " (edited)"}
            </p>
            {review.comment && <p className="mt-2 whitespace-pre-line break-words text-[15px] text-ink-700">{review.comment}</p>}
          </li>
        ))}
      </ul>

      {moreError && <ErrorState inline className="mt-2" title="Couldn't load more reviews" message={moreError} onRetry={loadMore} />}
      {nextOffset !== null && (
        <Button variant="outline" size="sm" className="mt-2" loading={loadingMore} loadingText="Loading…" onClick={() => void loadMore()}>
          Show more reviews
        </Button>
      )}
    </div>
  );
}
