"use client";

import { analyticsConfig } from "./config";

/**
 * Thin wrapper over gtag (GA4 + Google Ads) and the Meta Pixel.
 * Every call is a no-op when the corresponding ID isn't configured, so the app
 * behaves identically in development and in environments without tracking.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export type BookingStep = "location" | "vendor" | "services" | "pickup" | "details" | "review" | "confirmation";

export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
  window.fbq?.("trackCustom", name, params);
}

/** Funnel step, so drop-off between booking steps is visible in GA4. */
export function trackBookingStep(step: BookingStep): void {
  trackEvent("booking_step", { step });
}

export function trackBeginCheckout(value: number, itemCount: number): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", "begin_checkout", { currency: "INR", value, items_count: itemCount });
  window.fbq?.("track", "InitiateCheckout", { currency: "INR", value, num_items: itemCount });
}

interface PurchasePayload {
  orderId: string;
  value: number;
  itemCount: number;
  vendorId: string;
}

/** Order-placed conversion: GA4 purchase, Google Ads conversion and Meta Pixel Purchase. */
export function trackPurchase({ orderId, value, itemCount, vendorId }: PurchasePayload): void {
  if (typeof window === "undefined") return;

  window.gtag?.("event", "purchase", {
    transaction_id: orderId,
    value,
    currency: "INR",
    items: [{ item_id: vendorId, item_name: "Laundry order", quantity: itemCount, price: value }],
  });

  const { googleAdsId, googleAdsPurchaseLabel } = analyticsConfig;
  if (googleAdsId && googleAdsPurchaseLabel) {
    window.gtag?.("event", "conversion", {
      send_to: `${googleAdsId}/${googleAdsPurchaseLabel}`,
      value,
      currency: "INR",
      transaction_id: orderId,
    });
  }

  window.fbq?.("track", "Purchase", { value, currency: "INR", num_items: itemCount, content_type: "product" });
}
