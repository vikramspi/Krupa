import { formatINR } from "@/lib/format";
import type { PricingBreakdown } from "@/types";

/** Subtotal → pickup fee → discount → total, used on review, confirmation and order detail. */
export function PriceBreakdown({ pricing, totalLabel = "Total" }: { pricing: PricingBreakdown; totalLabel?: string }) {
  return (
    <dl className="space-y-2.5 text-[15px]">
      <div className="flex justify-between">
        <dt className="text-ink-600">Subtotal ({pricing.itemCount} {pricing.itemCount === 1 ? "item" : "items"})</dt>
        <dd className="tabular-nums text-ink-900">{formatINR(pricing.subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-ink-600">Pickup & delivery</dt>
        <dd className="tabular-nums">
          {pricing.pickupFee === 0 && pricing.pickupFeeOriginal > 0 ? (
            <>
              <span className="mr-1.5 text-ink-400 line-through">
                <span className="sr-only">was </span>
                {formatINR(pricing.pickupFeeOriginal)}
              </span>
              <span className="font-semibold text-emerald-700">Free</span>
            </>
          ) : (
            <span className="text-ink-900">{formatINR(pricing.pickupFee)}</span>
          )}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className={pricing.discount > 0 ? "text-emerald-700" : "text-ink-600"}>{pricing.discountLabel ?? "Discount"}</dt>
        <dd className={pricing.discount > 0 ? "font-semibold tabular-nums text-emerald-700" : "tabular-nums text-ink-500"}>
          {pricing.discount > 0 ? `−${formatINR(pricing.discount)}` : formatINR(0)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-bold text-ink-900">{totalLabel}</dt>
        <dd className="text-2xl font-bold tabular-nums tracking-tight text-ink-900">{formatINR(pricing.total)}</dd>
      </div>
    </dl>
  );
}
