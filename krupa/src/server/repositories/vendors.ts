import "server-only";
import { ServiceError, type CoveragePartner, type ServiceOfferingId, type Vendor } from "@/types";
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

/**
 * Errors worth trying again immediately rather than showing to anyone.
 *
 * "JWT issued at future" is the notable one: Supabase resolves our API key to a
 * short-lived token internally, and a small clock difference between its own
 * services can leave that token looking post-dated for a moment. It clears on
 * the next attempt.
 */
const TRANSIENT = /JWT issued at future|fetch failed|socket|ECONNRESET|ETIMEDOUT|timeout|temporarily|502|503|504/i;

type QueryResult<T> = { data: T | null; error: { message: string } | null };

/** Runs a read, retrying the blips. Anything else fails exactly as before. */
async function read<T>(action: string, run: () => PromiseLike<QueryResult<T>>): Promise<T> {
  const attempts = 3;
  for (let attempt = 1; ; attempt++) {
    const { data, error } = await run();
    if (!error) return data as T;
    if (attempt >= attempts || !TRANSIENT.test(error.message)) fail(action, error.message);
    console.warn(`[db] ${action} hit a transient error — retrying`, { attempt, message: error.message });
    await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
  }
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
  const data = await read("vendor area lookup", () =>
    supabase().from("vendors").select(COLUMNS).contains("coverage_areas", coversArea(areaId)),
  );
  return withReviewStats((data as VendorRow[]).map(toVendor));
}

export async function findVendorById(vendorId: string): Promise<Vendor | null> {
  const data = await read("vendor fetch", () =>
    supabase().from("vendors").select(COLUMNS).eq("id", vendorId).maybeSingle(),
  );
  if (!data) return null;
  const [vendor] = await withReviewStats([toVendor(data as VendorRow)]);
  return vendor;
}

/** Partners covering an area: how many exist at all, and how many are taking orders. */
export async function countVendorsForArea(areaId: string): Promise<{ total: number; active: number }> {
  const data = await read("vendor count", () =>
    supabase().from("vendors").select("is_active").contains("coverage_areas", coversArea(areaId)),
  );
  const rows = (data ?? []) as { is_active: boolean }[];
  return { total: rows.length, active: rows.filter((row) => row.is_active).length };
}

/**
 * The marketing figures and the coverage map describe the network, not a single
 * customer's data, so the last good answer stays usable. Serving it through a
 * database blip is far better than a homepage that claims zero partners — and
 * that page is cached for five minutes, so a bad render would stick around.
 */
type NetworkStats = { partnerCount: number; averageRating: number | null };
let lastGoodStats: NetworkStats | null = null;
let lastGoodCoverage: CoveragePartner[] | null = null;

export async function getNetworkStats(): Promise<NetworkStats> {
  try {
    const data = await read("network stats", () => supabase().from("vendors").select(COLUMNS).eq("is_active", true));
    const vendors = await withReviewStats((data as VendorRow[]).map(toVendor));
    const ratings = vendors.map((vendor) => vendor.rating).filter((r): r is number => r !== null);
    lastGoodStats = {
      partnerCount: vendors.length,
      averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    };
    return lastGoodStats;
  } catch (error) {
    if (lastGoodStats) {
      console.warn("[db] network stats unavailable — serving the last good figures");
      return lastGoodStats;
    }
    throw error;
  }
}

/**
 * Partners for the public coverage map — every partner, including those at
 * capacity, so the map reflects the real network. The returned shape drops the
 * contact number and the street coordinates on purpose: the map places pins
 * from coverage areas, never from a partner's own address.
 */
export async function listPartnersForCoverageMap(): Promise<CoveragePartner[]> {
  let vendors: Vendor[];
  try {
    const data = await read("coverage map", () => supabase().from("vendors").select(COLUMNS));
    vendors = await withReviewStats((data as VendorRow[]).map(toVendor));
  } catch (error) {
    if (lastGoodCoverage) {
      console.warn("[db] coverage map unavailable — serving the last good partner list");
      return lastGoodCoverage;
    }
    throw error;
  }
  lastGoodCoverage = vendors
    .filter((vendor) => vendor.coverageAreaIds.length > 0)
    .map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      coverageAreaIds: vendor.coverageAreaIds,
      services: vendor.services,
      turnaroundHours: vendor.turnaroundHours,
      rating: vendor.rating,
      reviewCount: vendor.reviewCount,
      isActive: vendor.isActive,
      acceptsSameDay: vendor.acceptsSameDay,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return lastGoodCoverage;
}
