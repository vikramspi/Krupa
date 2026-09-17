import type { ServiceOfferingId } from "./catalog";
import type { Coordinates } from "./location";

export interface HourRange {
  min: number;
  max: number;
}

/** A laundry partner, as stored in the `vendors` table. */
export interface Vendor {
  id: string;
  name: string;
  contactPhone: string;
  /** Service-area ids this partner collects from. */
  coverageAreaIds: string[];
  services: ServiceOfferingId[];
  turnaroundHours: HourRange;
  /**
   * Average of published customer reviews; falls back to the rating entered in the
   * vendors table when there are none. Null hides the stars entirely.
   */
  rating: number | null;
  /** Published customer reviews behind `rating` (0 = the rating, if any, is the manual one). */
  reviewCount: number;
  /** False = not currently accepting orders (shown as "at capacity"). */
  isActive: boolean;
  priceMultiplier: number;
  pickupFee: number;
  /** Null when not set — distance is then hidden rather than guessed. */
  coordinates: Coordinates | null;
  acceptsSameDay: boolean;
}

export type MatchReason = "closest" | "top_rated" | "fastest" | "pickup_today" | "most_services";

/** A vendor ranked for a specific location. */
export interface MatchedVendor extends Vendor {
  /** Null when the partner has no coordinates on record. */
  distanceKm: number | null;
  /** 0–100 composite score. */
  matchScore: number;
  matchReasons: MatchReason[];
  isBestMatch: boolean;
  /** Customer-facing mirror of `!isActive`. */
  atCapacity: boolean;
  /** Takes same-day pickups AND still has a bookable slot today (Mumbai time). */
  pickupToday: boolean;
}

export interface VendorMatchResult {
  areaName: string;
  vendors: MatchedVendor[];
  /** How many partners were evaluated in total (network size). */
  evaluatedCount: number;
}

export interface NetworkStats {
  partnerCount: number;
  averageRating: number | null;
  areasServed: number;
}

export type SlotAvailability = "available" | "limited" | "full" | "past";

export interface PickupSlot {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  availability: SlotAvailability;
}

/** A published customer review, as shown publicly. */
export interface VendorReview {
  id: string;
  /** "Vikram K." — first name and last initial only. */
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  /** True when the customer edited it after posting. */
  edited: boolean;
}

export interface VendorReviewSummary {
  average: number | null;
  count: number;
  /** Count of reviews per star value, index 0 = 1 star … index 4 = 5 stars. */
  distribution: [number, number, number, number, number];
}

export interface VendorReviewPage {
  summary: VendorReviewSummary;
  reviews: VendorReview[];
  /** Offset for the next page, or null when there are no more. */
  nextOffset: number | null;
}

/** The signed-in customer's own review of one order. */
export interface OrderReview {
  rating: number;
  comment: string | null;
  updatedAt: string;
}
