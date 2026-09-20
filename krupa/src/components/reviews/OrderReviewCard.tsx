"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { RatingStars } from "@/components/ui/RatingStars";
import { useAsync } from "@/hooks/useAsync";
import { getErrorMessage } from "@/lib/errors";
import { orderService } from "@/services";
import type { Order, OrderReview } from "@/types";
import { StarRatingInput } from "./StarRatingInput";

const MAX_COMMENT = 1000;

/**
 * "Rate your laundry partner" for one of the customer's own orders. Shown only
 * once the order is delivered; the server enforces the same rule.
 */
export function OrderReviewCard({ order }: { order: Pick<Order, "id" | "status" | "vendor"> }) {
  const delivered = order.status === "delivered";
  const existing = useAsync(() => orderService.getOrderReview(order.id), `order-review:${order.id}`, { enabled: delivered });
  const [saved, setSaved] = useState<OrderReview | null>(null);
  const [editing, setEditing] = useState(false);

  if (!delivered) return null;

  const titleId = `review-${order.id}`;
  const review = saved ?? existing.data?.review ?? null;

  let body;
  if (existing.status === "loading" || existing.status === "idle") {
    body = <Skeleton className="mt-3 h-24" />;
  } else if (existing.status === "error") {
    body = <ErrorState inline className="mt-3" title="Couldn't load your review" message={existing.error ?? ""} onRetry={existing.reload} />;
  } else if (review && !editing) {
    body = (
      <div className="mt-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {saved ? "Thanks — your review is published." : "You reviewed this order."}
        </p>
        <RatingStars rating={review.rating} size="md" className="mt-2" />
        {review.comment && <p className="mt-2 whitespace-pre-line break-words text-[15px] text-ink-700">{review.comment}</p>}
        <Button variant="ghost" size="sm" className="mt-2" leadingIcon={<Pencil className="size-4" aria-hidden="true" />} onClick={() => setEditing(true)}>
          Edit review
        </Button>
      </div>
    );
  } else {
    body = (
      <ReviewForm
        orderId={order.id}
        vendorName={order.vendor.name}
        initial={review}
        onSaved={(next) => {
          setSaved(next);
          setEditing(false);
        }}
        onCancel={review ? () => setEditing(false) : undefined}
      />
    );
  }

  return (
    <Card as="section" id={titleId} aria-labelledby={`${titleId}-title`} className="scroll-mt-24">
      <h2 id={`${titleId}-title`} className="font-semibold text-ink-900">
        Rate {order.vendor.name}
      </h2>
      <p className="mt-0.5 text-sm text-ink-500">Your review helps other customers choose. It shows your first name and last initial.</p>
      {body}
    </Card>
  );
}

function ReviewForm({
  orderId,
  vendorName,
  initial,
  onSaved,
  onCancel,
}: {
  orderId: string;
  vendorName: string;
  initial: OrderReview | null;
  onSaved: (review: OrderReview) => void;
  onCancel?: () => void;
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [ratingError, setRatingError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const commentId = `review-comment-${orderId}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (rating < 1) {
      setRatingError("Choose a star rating.");
      return;
    }
    setRatingError(undefined);
    setError(null);
    setSaving(true);
    try {
      onSaved(await orderService.saveOrderReview(orderId, { rating, comment }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="mt-4 space-y-4">
      <StarRatingInput legend={`How was ${vendorName}?`} value={rating} onChange={(v) => { setRating(v); setRatingError(undefined); }} error={ratingError} />
      <div>
        <label htmlFor={commentId} className="text-sm font-semibold text-ink-800">
          Your review <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <textarea
          id={commentId}
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, MAX_COMMENT))}
          rows={4}
          maxLength={MAX_COMMENT}
          placeholder="Pickup on time? Clothes cleaned and pressed well?"
          className="mt-1.5 block w-full rounded-2xl border border-line bg-white px-4 py-3 text-[15px] text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
        <p className="mt-1 text-right text-xs text-ink-400" aria-live="polite">
          {comment.length}/{MAX_COMMENT}
        </p>
      </div>
      {error && <ErrorState inline title="Couldn't save your review" message={error} />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={saving} loadingText="Saving…">
          {initial ? "Update review" : "Post review"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
