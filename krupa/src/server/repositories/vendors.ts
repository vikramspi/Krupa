import "server-only";
import { ServiceError, type ServiceOfferingId, type Vendor } from "@/types";
import { supabase } from "../supabase";
import { getReviewStats } from "./reviews";

interface VendorRow {
  id: string;
  name: string;
  contact_phone: string;
  coverage_areas: string[] | null;
  offered_service_ids: string[] | null;
  turnaround_estimate: { min_hours?: number; max_hours?: number } | null;
  rating: number | string | null;
  is_active: boolean;
  price_multiplier: number | string;
  pickup_fee: number;
  latitude: number | string | null;
  longitude: number | string | null;
  accepts_same_day: boolean;
}

const COLUMNS =
  "id, name, contact_phone, coverage_areas, offered_service_ids, turnaround_estimate, rating, is_active, price_multiplier, pickup_fee, latitude, longitude, accepts_same_day";

function fail(action: string, message: string): never {
  console.error(`[db] ${action} failed`, { message });
  throw new ServiceError("We couldn't reach our servers. Please try again.", "network");
}

/** Postgres numerics arrive as strings over PostgREST. */
const num = (value: number | string | null): number | null =>
  value === null || value === "" ? null : typeof value === "number" ? value : Number(value);

function toVendor(row: VendorRow): Vendor {
  const latitude = num(row.latitude);
  const longitude = num(row.longitude);
  return {
    id: row.id,
    name: row.name,
    contactPhone: row.contact_phone,
    coverageAreaIds: row.coverage_areas ?? [],
    services: (row.offered_service_ids ?? []) as ServiceOfferingId[],
    turnaroundHours: {
      min: row.turnaround_estimate?.min_hours ?? 24,
      max: row.turnaround_estimate?.max_hours ?? 48,
    },
    rating: num(row.rating),
    reviewCount: 0,
    isActive: row.is_active,
    priceMultiplier: num(row.price_multiplier) ?? 1,
    pickupFee: row.pickup_fee,
    coordinates: latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null,
    acceptsSameDay: row.accepts_same_day,
  };
}

/**
 * `coverage_areas` is jsonb, so the containment value must be JSON (`["x"]`),
 * not a Postgres array literal (`{x}`) — passing a JS array yields the latter
 * and Postgres rejects it with "invalid input syntax for type json".
 */
const coversArea = (areaId: string) => JSON.stringify([areaId]);

/** Real reviews win: their average replaces the manually entered rating once any exist. */
async function withReviewStats(vendors: Vendor[]): Promise<Vendor[]> {
  const stats = await getReviewStats(vendors.map((vendor) => vendor.id));
  return vendors.map((vendor) => {
    const reviews = stats.get(vendor.id);
    return reviews ? { ...vendor, rating: reviews.average, reviewCount: reviews.count } : vendor;
  });
}

/** Partners whose coverage includes this area — inactive ones included, flagged as at capacity. */
export async function listVendorsForArea(areaId: string): Promise<Vendor[]> {
  const { data, error } = await supabase().from("vendors").select(COLUMNS).contains("coverage_areas", coversArea(areaId));
  if (error) fail("vendor area lookup", error.message);
  return withReviewStats((data as VendorRow[]).map(toVendor));
}

export async function findVendorById(vendorId: string): Promise<Vendor | null> {
  const { data, error } = await supabase().from("vendors").select(COLUMNS).eq("id", vendorId).maybeSingle();
  if (error) fail("vendor fetch", error.message);
  if (!data) return null;
  const [vendor] = await withReviewStats([toVendor(data as VendorRow)]);
  return vendor;
}

/** Partners covering an area: how many exist at all, and how many are taking orders. */
export async function countVendorsForArea(areaId: string): Promise<{ total: number; active: number }> {
  const { data, error } = await supabase()
    .from("vendors")
    .select("is_active")
    .contains("coverage_areas", coversArea(areaId));
  if (error) fail("vendor count", error.message);
  const rows = (data ?? []) as { is_active: boolean }[];
  return { total: rows.length, active: rows.filter((row) => row.is_active).length };
}

export async function getNetworkStats(): Promise<{ partnerCount: number; averageRating: number | null }> {
  const { data, error } = await supabase().from("vendors").select(COLUMNS).eq("is_active", true);
  if (error) fail("network stats", error.message);
  const vendors = await withReviewStats((data as VendorRow[]).map(toVendor));
  const ratings = vendors.map((vendor) => vendor.rating).filter((r): r is number => r !== null);
  return {
    partnerCount: vendors.length,
    averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
  };
}
