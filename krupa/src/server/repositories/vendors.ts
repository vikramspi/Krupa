import "server-only";
import type { CoveragePartner, ServiceOfferingId, Vendor } from "@/types";
import { supabase } from "../supabase";
import { getReviewStats } from "./reviews";
import { reportDbError } from "./dbError";

interface VendorRow {
  id: string;
  name: string;
  contact_phone: string;
  coverage_areas: string[] | null;
  /** Absent, not just null, until migration 0008 has been applied. */
  coverage_area_names?: string[] | null;
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

const BASE_COLUMNS =
  "id, name, contact_phone, coverage_areas, offered_service_ids, turnaround_estimate, rating, is_active, price_multiplier, pickup_fee, latitude, longitude, accepts_same_day";

/**
 * `coverage_area_names` only exists once migration 0008 has been applied, and
 * selecting a column that isn't there fails the *whole* query (Postgres 42703).
 * That would take out partner matching, the coverage map and the homepage
 * figures together, so it is appended separately and dropped on the first 42703
 * — the same tolerance `reviews.ts` gives a missing `vendor_reviews` table.
 */
const IMPORTED_COLUMN = "coverage_area_names";
const UNDEFINED_COLUMN = "42703";

let importedColumnMissing = false;
let warnedImportedColumn = false;

const withImported = (base: string) => (importedColumnMissing ? base : `${base}, ${IMPORTED_COLUMN}`);
const vendorColumns = () => withImported(BASE_COLUMNS);

function fail(action: string, message: string): never {
  reportDbError(action, message);
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

type QueryResult<T> = { data: T | null; error: { message: string; code?: string } | null };

/** Runs a read, retrying the blips. Anything else fails exactly as before. */
async function read<T>(action: string, run: () => PromiseLike<QueryResult<T>>): Promise<T> {
  const attempts = 3;
  for (let attempt = 1; ; attempt++) {
    // Whether THIS attempt asked for the imported column decides if a 42703 is
    // worth retrying. Reading the flag after the query instead would hard-fail
    // whichever of two concurrent queries lost the race to set it.
    const askedForImported = !importedColumnMissing;
    const { data, error } = await run();
    if (!error) return data as T;
    // Migration 0008 isn't applied: drop its column and run the same query again.
    if (error.code === UNDEFINED_COLUMN && askedForImported) {
      importedColumnMissing = true;
      if (!warnedImportedColumn) {
        console.warn(
          `[db] vendors.${IMPORTED_COLUMN} is missing — run supabase/migrations/0008_mumbai_vendors.sql.` +
            " Partners are matched on area ids alone until then.",
        );
        warnedImportedColumn = true;
      }
      continue;
    }
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

/**
 * Narrows an area-id match to the partners carrying one of that area's imported
 * locality labels, so neighbouring localities don't leak into each other's
 * results.
 *
 * Narrowing only applies when BOTH sides have labels. An area with none of its
 * own (Tardeo, Sion) and a partner with none on record (every row before
 * migration 0008) each mean "the area id is all we know" — which must still
 * match, rather than quietly returning no partners at all.
 */
function matchesCoverageNames(coverageNames: string[] | null, rowNames: string[] | null | undefined): boolean {
  if (!coverageNames?.length || !rowNames?.length) return true;
  return coverageNames.some((name) => rowNames.includes(name));
}

/** Real reviews win: their average replaces the manually entered rating once any exist. */
async function withReviewStats(vendors: Vendor[]): Promise<Vendor[]> {
  const stats = await getReviewStats(vendors.map((vendor) => vendor.id));
  return vendors.map((vendor) => {
    const reviews = stats.get(vendor.id);
    return reviews ? { ...vendor, rating: reviews.average, reviewCount: reviews.count } : vendor;
  });
}

/** Partners whose coverage includes this area — inactive ones included, flagged as at capacity. */
export async function listVendorsForArea(areaId: string, coverageNames: string[] | null = null): Promise<Vendor[]> {
  const data = await read("vendor area lookup", () =>
    supabase().from("vendors").select(vendorColumns()).contains("coverage_areas", coversArea(areaId)),
  );
  const rows = data as unknown as VendorRow[];
  const matchingRows = rows.filter((row) => matchesCoverageNames(coverageNames, row.coverage_area_names));
  return withReviewStats(matchingRows.map(toVendor));
}

export async function findVendorById(vendorId: string): Promise<Vendor | null> {
  const data = await read("vendor fetch", () =>
    supabase().from("vendors").select(vendorColumns()).eq("id", vendorId).maybeSingle(),
  );
  if (!data) return null;
  const [vendor] = await withReviewStats([toVendor(data as VendorRow)]);
  return vendor;
}

/** Partners covering an area: how many exist at all, and how many are taking orders. */
export async function countVendorsForArea(
  areaId: string,
  coverageNames: string[] | null = null,
): Promise<{ total: number; active: number }> {
  const data = await read("vendor count", () =>
    supabase().from("vendors").select(withImported("is_active")).contains("coverage_areas", coversArea(areaId)),
  );
  const rows = (data ?? []) as unknown as { is_active: boolean; coverage_area_names?: string[] | null }[];
  const matchingRows = rows.filter((row) => matchesCoverageNames(coverageNames, row.coverage_area_names));
  return { total: matchingRows.length, active: matchingRows.filter((row) => row.is_active).length };
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
    const data = await read("network stats", () => supabase().from("vendors").select(vendorColumns()).eq("is_active", true));
    const vendors = await withReviewStats((data as unknown as VendorRow[]).map(toVendor));
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
    const data = await read("coverage map", () => supabase().from("vendors").select(vendorColumns()));
    vendors = await withReviewStats((data as unknown as VendorRow[]).map(toVendor));
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
