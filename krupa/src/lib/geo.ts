import type { Coordinates } from "@/types";

const EARTH_RADIUS_KM = 6371;
/** Straight-line distance understates Mumbai road distance; this approximates travel distance. */
const ROAD_FACTOR = 1.25;

/** Approximate road distance in km between two points, rounded to one decimal. */
export function roadDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const straight = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  return Math.round(straight * ROAD_FACTOR * 10) / 10;
}
