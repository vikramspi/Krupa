"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useBookingStore } from "@/state/bookingStore";
import { BOOKING_ROUTES, firstBlockingStep, type BookingRouteStep } from "@/state/bookingSteps";
import { useStoresHydrated } from "@/state/hydration";

/**
 * Sends the customer back to the earliest incomplete step if they land on a step
 * whose prerequisites are missing (deep link, refresh after the session expired, etc.).
 * Returns `true` once it's safe to render the step.
 */
export function useBookingGuard(step: BookingRouteStep, { disabled = false }: { disabled?: boolean } = {}): boolean {
  const router = useRouter();
  const hydrated = useStoresHydrated();
  const blocking = useBookingStore((state) => firstBlockingStep(step, state));

  useEffect(() => {
    if (hydrated && blocking && !disabled) router.replace(BOOKING_ROUTES[blocking]);
  }, [hydrated, blocking, disabled, router]);

  return hydrated && (disabled || blocking === null);
}
