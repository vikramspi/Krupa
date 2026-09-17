import type { Coordinates, MatchReason, MatchedVendor, Vendor } from "@/types";
import { roadDistanceKm } from "./geo";
import { hasPickupToday } from "./schedule";

/**
 * Ranks the partners that already cover the customer's area (coverage filtering
 * happens in the query). Missing data is treated as neutral rather than bad: an
 * unrated partner or one without coordinates isn't pushed to the bottom.
 */
export const MATCH_WEIGHTS = {
  distance: 35,
  rating: 25,
  sameDay: 15,
  turnaround: 15,
  serviceBreadth: 10,
} as const;

const TOTAL_OFFERINGS = 8;
const NEUTRAL = 0.5;
/** Beyond this, distance scores zero — partners still match if they cover the area. */
const DISTANCE_CEILING_KM = 12;
const INACTIVE_PENALTY = 0.4;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function matchVendors(vendors: Vendor[], origin: Coordinates | null, now: Date = new Date()): MatchedVendor[] {
  const scored = vendors.map((vendor) => {
    const distanceKm = origin && vendor.coordinates ? roadDistanceKm(origin, vendor.coordinates) : null;

    const raw =
      MATCH_WEIGHTS.distance * (distanceKm === null ? NEUTRAL : clamp01(1 - distanceKm / DISTANCE_CEILING_KM)) +
      MATCH_WEIGHTS.rating * (vendor.rating === null ? NEUTRAL : clamp01((vendor.rating - 4) / 1)) +
      MATCH_WEIGHTS.sameDay * (vendor.acceptsSameDay ? 1 : 0) +
      MATCH_WEIGHTS.turnaround * clamp01(1 - (vendor.turnaroundHours.max - 36) / 48) +
      MATCH_WEIGHTS.serviceBreadth * clamp01(vendor.services.length / TOTAL_OFFERINGS);

    return { vendor, distanceKm, matchScore: Math.round(vendor.isActive ? raw : raw * INACTIVE_PENALTY) };
  });

  const available = scored.filter((s) => s.vendor.isActive);

  /** A reason is only worth showing when it singles one partner out. */
  const pickWinner = (value: (entry: (typeof scored)[number]) => number | null) => {
    const rated = available.filter((entry) => value(entry) !== null);
    if (rated.length < 2) return null;
    const best = Math.max(...rated.map((entry) => value(entry) as number));
    const winners = rated.filter((entry) => value(entry) === best);
    return winners.length === 1 ? winners[0].vendor.id : null;
  };

  const closestId = pickWinner((e) => (e.distanceKm === null ? null : -e.distanceKm));
  const topRatedId = pickWinner((e) => e.vendor.rating);
  const fastestId = pickWinner((e) => -e.vendor.turnaroundHours.max);
  const broadestId = pickWinner((e) => e.vendor.services.length);
  const bestId = available.length ? available.reduce((a, b) => (b.matchScore > a.matchScore ? b : a)).vendor.id : null;

  return scored
    .map(({ vendor, distanceKm, matchScore }): MatchedVendor => {
      const reasons: MatchReason[] = [];
      if (vendor.id === closestId) reasons.push("closest");
      if (vendor.id === topRatedId) reasons.push("top_rated");
      if (vendor.id === fastestId) reasons.push("fastest");
      const pickupToday = vendor.isActive && hasPickupToday(vendor, now);
      if (pickupToday) reasons.push("pickup_today");
      if (vendor.id === broadestId) reasons.push("most_services");
      return {
        ...vendor,
        distanceKm,
        matchScore,
        matchReasons: reasons,
        isBestMatch: vendor.id === bestId,
        atCapacity: !vendor.isActive,
        pickupToday,
      };
    })
    .sort((a, b) => Number(a.atCapacity) - Number(b.atCapacity) || b.matchScore - a.matchScore);
}

export type VendorSort = "best" | "nearest" | "rating" | "fastest" | "price";

export const VENDOR_SORT_LABELS: Record<VendorSort, string> = {
  best: "Best match",
  nearest: "Nearest",
  rating: "Top rated",
  fastest: "Fastest",
  price: "Lowest price",
};

/** Sorts, keeping partners with no rating/distance below those that have one. */
export function sortVendors(vendors: MatchedVendor[], sort: VendorSort): MatchedVendor[] {
  const byMissing = <T>(a: T | null, b: T | null) => (a === null ? 1 : 0) - (b === null ? 1 : 0);

  const compare: Record<VendorSort, (a: MatchedVendor, b: MatchedVendor) => number> = {
    best: (a, b) => b.matchScore - a.matchScore,
    nearest: (a, b) => byMissing(a.distanceKm, b.distanceKm) || (a.distanceKm ?? 0) - (b.distanceKm ?? 0),
    rating: (a, b) => byMissing(a.rating, b.rating) || (b.rating ?? 0) - (a.rating ?? 0),
    fastest: (a, b) => a.turnaroundHours.max - b.turnaroundHours.max || a.turnaroundHours.min - b.turnaroundHours.min,
    price: (a, b) => a.priceMultiplier - b.priceMultiplier,
  };

  return [...vendors].sort((a, b) => Number(a.atCapacity) - Number(b.atCapacity) || compare[sort](a, b));
}

export const MATCH_REASON_LABELS: Record<MatchReason, string> = {
  closest: "Closest to you",
  top_rated: "Highest rated nearby",
  fastest: "Fastest turnaround",
  pickup_today: "Pickup today",
  most_services: "Most services",
};
