import type { CatalogItem, OrderLine, PricingBreakdown, Vendor } from "@/types";

/** Pickup is free once the subtotal reaches this amount. */
export const FREE_PICKUP_THRESHOLD = 499;
/** Orders at or above this subtotal get the "big bag" discount. */
export const DISCOUNT_THRESHOLD = 999;
export const DISCOUNT_RATE = 0.1;
export const DISCOUNT_CAP = 150;

/** Vendor-specific price for a catalog item, rounded to the nearest ₹5. */
export function priceForVendor(item: CatalogItem, vendor: Pick<Vendor, "priceMultiplier">): number {
  return Math.max(5, Math.round((item.basePrice * vendor.priceMultiplier) / 5) * 5);
}

export function calculatePricing(
  lines: Array<Pick<OrderLine, "unitPrice" | "quantity">>,
  vendor: Pick<Vendor, "pickupFee">,
): PricingBreakdown {
  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  const pickupFeeOriginal = itemCount > 0 ? vendor.pickupFee : 0;
  const pickupFee = subtotal >= FREE_PICKUP_THRESHOLD ? 0 : pickupFeeOriginal;

  const qualifiesForDiscount = subtotal >= DISCOUNT_THRESHOLD;
  const discount = qualifiesForDiscount ? Math.min(DISCOUNT_CAP, Math.round(subtotal * DISCOUNT_RATE)) : 0;

  return {
    subtotal,
    pickupFee,
    pickupFeeOriginal,
    discount,
    discountLabel: qualifiesForDiscount ? "Big bag offer · 10% off" : null,
    total: subtotal + pickupFee - discount,
    itemCount,
  };
}

export interface PricingNudge {
  kind: "free_pickup" | "discount";
  amountAway: number;
  message: string;
}

/** Tells the customer how close they are to the next saving, if any. */
export function getPricingNudge(pricing: PricingBreakdown): PricingNudge | null {
  if (pricing.itemCount === 0) return null;
  if (pricing.subtotal < FREE_PICKUP_THRESHOLD && pricing.pickupFeeOriginal > 0) {
    const away = FREE_PICKUP_THRESHOLD - pricing.subtotal;
    return { kind: "free_pickup", amountAway: away, message: `Add ₹${away} more for free pickup` };
  }
  if (pricing.subtotal < DISCOUNT_THRESHOLD) {
    const away = DISCOUNT_THRESHOLD - pricing.subtotal;
    return { kind: "discount", amountAway: away, message: `Add ₹${away} more to get 10% off` };
  }
  return null;
}
