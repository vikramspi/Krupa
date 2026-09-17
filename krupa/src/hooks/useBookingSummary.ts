"use client";

import { useMemo } from "react";
import { calculatePricing, getPricingNudge } from "@/lib/pricing";
import { effectiveTurnaround } from "@/lib/schedule";
import { useBookingStore } from "@/state/bookingStore";

/** Derived, always-consistent pricing for the in-progress booking. */
export function useBookingSummary() {
  const vendor = useBookingStore((s) => s.vendor);
  const cart = useBookingStore((s) => s.cart);
  const location = useBookingStore((s) => s.location);
  const pickup = useBookingStore((s) => s.pickup);

  return useMemo(() => {
    const pricing = calculatePricing(cart, { pickupFee: vendor?.pickupFee ?? 0 });
    return {
      vendor,
      cart,
      location,
      pickup,
      pricing,
      nudge: getPricingNudge(pricing),
      turnaround: vendor ? effectiveTurnaround(vendor, cart) : null,
    };
  }, [vendor, cart, location, pickup]);
}

export type BookingSummary = ReturnType<typeof useBookingSummary>;
