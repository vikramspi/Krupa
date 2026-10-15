import "server-only";
import type { AdminVendor, AdminVendorSummary, OrderStatus } from "@/types";
import { supabase } from "../supabase";
import { fail, num } from "./shared";

interface Row {
  id: string;
  vendor_code?: string | null;
  name: string;
  contact_email?: string | null;
  contact_phone: string;
  coverage_areas: string[] | null;
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
  created_at: string;
}

const BASE_COLUMNS =
  "id, name, contact_phone, coverage_areas, offered_service_ids, turnaround_estimate, rating, is_active, price_multiplier, pickup_fee, latitude, longitude, accepts_same_day, created_at";

/**
 * Columns migration 0008 adds. Until it has been applied they are not there,
 * and Postgres fails the *whole* query over one unknown name (42703) — which
 * took the entire vendor section of this panel down, list and detail alike,
 * while the data it was meant to show sat in the table untouched.
 *
 * A partner the operator cannot see is worse than a partner shown without its
 * code, so these are tried once and dropped if the database hasn't got them.
 * Everything still works when 0008 lands; the extra fields simply reappear.
 */
const IMPORTED_COLUMNS = ["vendor_code", "contact_email", "coverage_area_names"] as const;
/** 42703 on a read, PGRST204 on a write: "that column isn't there". */
const MISSING_COLUMN = /42703|PGRST204|does not exist|schema cache/i;

let importedColumnsMissing = false;
let warnedImportedColumns = false;

function noteImportedColumnsMissing(): void {
  importedColumnsMissing = true;
  if (warnedImportedColumns) return;
  warnedImportedColumns = true;
  console.warn(
    "[db] vendors is missing vendor_code / contact_email / coverage_area_names — serving partners without them. Apply supabase/migrations/0008_mumbai_vendors.sql to restore the full record.",
  );
}

const vendorColumns = (): string =>
  importedColumnsMissing ? BASE_COLUMNS : `${BASE_COLUMNS}, ${IMPORTED_COLUMNS.join(", ")}`;

/**
 * Loose on purpose: `select()` is handed a string built at runtime, so
 * supabase-js cannot infer a row type and callers cast the result themselves.
 */
type QueryResult = { data: unknown; error: { message: string; code?: string } | null };

/** Runs a vendor query, retrying once without the 0008 columns if they're absent. */
async function readVendors(action: string, run: () => PromiseLike<QueryResult>): Promise<unknown> {
  const { data, error } = await run();
  if (!error) return data;
  if (importedColumnsMissing || !MISSING_COLUMN.test(`${error.code ?? ""} ${error.message}`)) {
    fail(action, error.message);
  }
  noteImportedColumnsMissing();
  // toColumns() and vendorColumns() both read the flag, so the retry is built
  // without the absent columns rather than repeating the same failing request.
  const retry = await run();
  if (retry.error) fail(action, retry.error.message);
  return retry.data;
}

const toVendor = (row: Row): AdminVendor => ({
  id: row.id,
  vendorCode: row.vendor_code ?? null,
  name: row.name,
  contactEmail: row.contact_email ?? null,
  contactPhone: row.contact_phone,
  coverageAreas: row.coverage_areas ?? [],
  coverageNames: row.coverage_area_names ?? [],
  services: row.offered_service_ids ?? [],
  turnaround: { minHours: row.turnaround_estimate?.min_hours ?? 24, maxHours: row.turnaround_estimate?.max_hours ?? 48 },
  rating: num(row.rating),
  isActive: row.is_active,
  priceMultiplier: num(row.price_multiplier) ?? 1,
  pickupFee: row.pickup_fee,
  latitude: num(row.latitude),
  longitude: num(row.longitude),
  acceptsSameDay: row.accepts_same_day,
  createdAt: row.created_at,
});

export async function listVendors(): Promise<AdminVendorSummary[]> {
  const db = supabase();
  const [vendorRows, orders, reviews, users] = await Promise.all([
    readVendors("vendor list", () => db.from("vendors").select(vendorColumns()).order("name")) as Promise<Row[]>,
    db.from("orders").select("vendor_id, status"),
    db.from("vendor_reviews").select("vendor_id, rating").eq("is_published", true),
    db.from("vendor_users").select("vendor_id").eq("is_active", true),
  ]);
  if (orders.error) fail("vendor order counts", orders.error.message);
  if (reviews.error) fail("vendor review stats", reviews.error.message);
  if (users.error) fail("vendor login counts", users.error.message);

  const orderRows = orders.data as { vendor_id: string; status: OrderStatus }[];
  const reviewRows = reviews.data as { vendor_id: string; rating: number }[];
  const userRows = users.data as { vendor_id: string }[];

  return vendorRows.map((row) => {
    const mine = orderRows.filter((o) => o.vendor_id === row.id);
    const ratings = reviewRows.filter((r) => r.vendor_id === row.id).map((r) => r.rating);
    return {
      ...toVendor(row),
      totalOrders: mine.length,
      openOrders: mine.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length,
      reviewAverage: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
      reviewCount: ratings.length,
      logins: userRows.filter((u) => u.vendor_id === row.id).length,
    };
  });
}

export async function findVendor(id: string): Promise<AdminVendor | null> {
  const data = (await readVendors("vendor fetch", () =>
    supabase().from("vendors").select(vendorColumns()).eq("id", id).maybeSingle(),
  )) as Row | null;
  return data ? toVendor(data) : null;
}

export interface VendorInput {
  name: string;
  contactEmail: string | null;
  contactPhone: string;
  coverageAreas: string[];
  coverageNames: string[];
  services: string[];
  turnaround: { minHours: number; maxHours: number };
  rating: number | null;
  isActive: boolean;
  priceMultiplier: number;
  pickupFee: number;
  latitude: number | null;
  longitude: number | null;
  acceptsSameDay: boolean;
}

/**
 * Built fresh per attempt: if the write comes back saying 0008 hasn't run, the
 * retry has to leave those columns out rather than send them again. An email or
 * an imported area list typed before 0008 lands is therefore not stored — the
 * form still shows it, so it can be saved again once the migration is applied.
 */
const toColumns = (input: VendorInput) => ({
  name: input.name,
  ...(importedColumnsMissing ? {} : { contact_email: input.contactEmail, coverage_area_names: input.coverageNames }),
  contact_phone: input.contactPhone,
  coverage_areas: input.coverageAreas,
  offered_service_ids: input.services,
  turnaround_estimate: { min_hours: input.turnaround.minHours, max_hours: input.turnaround.maxHours },
  rating: input.rating,
  is_active: input.isActive,
  price_multiplier: input.priceMultiplier,
  pickup_fee: input.pickupFee,
  latitude: input.latitude,
  longitude: input.longitude,
  accepts_same_day: input.acceptsSameDay,
});

export async function createVendor(input: VendorInput): Promise<AdminVendor> {
  const data = (await readVendors("vendor create", () =>
    supabase().from("vendors").insert(toColumns(input)).select(vendorColumns()).single(),
  )) as Row;
  return toVendor(data);
}

export async function updateVendor(id: string, input: VendorInput): Promise<AdminVendor | null> {
  const data = (await readVendors("vendor update", () =>
    supabase().from("vendors").update(toColumns(input)).eq("id", id).select(vendorColumns()).maybeSingle(),
  )) as Row | null;
  return data ? toVendor(data) : null;
}
