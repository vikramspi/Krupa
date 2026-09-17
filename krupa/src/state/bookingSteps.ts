import { toDateKey } from "@/lib/format";
import type { useBookingStore } from "./bookingStore";

type BookingSnapshot = ReturnType<typeof useBookingStore.getState>;

export type BookingRouteStep = "location" | "vendors" | "services" | "schedule" | "details" | "review";

export const BOOKING_ROUTES: Record<BookingRouteStep, string> = {
  location: "/book/location",
  vendors: "/book/vendors",
  services: "/book/services",
  schedule: "/book/schedule",
  details: "/book/details",
  review: "/book/review",
};

/** The five stages shown in the progress indicator. Schedule + details together form "Pickup". */
export const PROGRESS_STEPS = [
  { id: "location", label: "Location", href: BOOKING_ROUTES.location },
  { id: "vendor", label: "Vendor", href: BOOKING_ROUTES.vendors },
  { id: "services", label: "Services", href: BOOKING_ROUTES.services },
  { id: "pickup", label: "Pickup", href: BOOKING_ROUTES.schedule },
  { id: "review", label: "Review", href: BOOKING_ROUTES.review },
] as const;

export type ProgressStepId = (typeof PROGRESS_STEPS)[number]["id"];

export const ROUTE_TO_PROGRESS: Record<BookingRouteStep, ProgressStepId> = {
  location: "location",
  vendors: "vendor",
  services: "services",
  schedule: "pickup",
  details: "pickup",
  review: "review",
};

const ORDER: BookingRouteStep[] = ["location", "vendors", "services", "schedule", "details", "review"];

/** Whether the data a step produces is present and still valid. */
function isStepComplete(step: BookingRouteStep, state: BookingSnapshot): boolean {
  switch (step) {
    case "location":
      return !!state.location;
    case "vendors":
      return !!state.vendor;
    case "services":
      return state.cart.length > 0;
    case "schedule":
      // A pickup date that has already passed (e.g. the tab stayed open overnight) no longer counts.
      return !!state.pickup && state.pickup.date >= toDateKey(new Date());
    case "details":
      return !!state.details;
    case "review":
      return false;
  }
}

/** The earliest step the customer still needs to complete before reaching `target`. */
export function firstBlockingStep(target: BookingRouteStep, state: BookingSnapshot): BookingRouteStep | null {
  for (const step of ORDER.slice(0, ORDER.indexOf(target))) {
    if (!isStepComplete(step, state)) return step;
  }
  return null;
}

export function isProgressStepReachable(stepId: ProgressStepId, state: BookingSnapshot): boolean {
  const route = (Object.keys(ROUTE_TO_PROGRESS) as BookingRouteStep[]).find((r) => ROUTE_TO_PROGRESS[r] === stepId);
  return !!route && firstBlockingStep(route, state) === null;
}
