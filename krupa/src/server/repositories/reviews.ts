import "server-only";
import { ServiceError, type OrderReview, type OrderStatus, type VendorReview, type VendorReviewPage, type VendorReviewSummary } from "@/types";
import { supabase } from "../supabase";

/**
 * Vendor reviews. Every review belongs to one delivered order of the reviewing
 * customer (checked by the route handler), so only real customers can post one.
 */
const TABLE = "vendor_reviews";
/** Migration 0006 not applied yet: PostgREST's "table not in schema cache", or Postgres "relation does not exist". */
const MISSING_TABLE_CODES = new Set(["PGRST205", "42P01"]);

let warnedMissingTable = false;

function fail(action: string, message: string): never {
  console.error(`[db] ${action} failed`, { message });
  throw new ServiceError("We couldn't reach our servers. Please try again.", "network");
}

/** Reviews are optional: without the table the rest of the site keeps working. */
function missingTable(error: { code?: string } | null): boolean {
  if (!error?.code || !MISSING_TABLE_CODES.has(error.code)) return false;
  if (!warnedMissingTable) {
    console.warn("[reviews] vendor_reviews table missing — run supabase/migrations/0006_vendor_reviews.sql");
    warnedMissingTable = true;
  }
  return true;
}

/** "Vikram Kanaujiya" → "Vikram K." */
export function publicAuthorName(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Krupa customer";
  const first = parts[0].slice(0, 30);
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function summarise(ratings: number[]): VendorReviewSummary {
  const distribution: VendorReviewSummary["distribution"] = [0, 0, 0, 0, 0];
  for (const rating of ratings) distribution[rating - 1] += 1;
  return {
    average: ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
    count: ratings.length,
    distribution,
  };
}

/** Average rating and count per vendor, from published reviews only. */
export async function getReviewStats(vendorIds: string[]): Promise<Map<string, { average: number; count: number }>> {
  const stats = new Map<string, { average: number; count: number }>();
  if (vendorIds.length === 0) return stats;

  const { data, error } = await supabase()
    .from(TABLE)
    .select("vendor_id, rating")
    .in("vendor_id", vendorIds)
    .eq("is_published", true);
  if (missingTable(error)) return stats;
  if (error) fail("review stats", error.message);

  const byVendor = new Map<string, number[]>();
  for (const row of data as { vendor_id: string; rating: number }[]) {
    byVendor.set(row.vendor_id, [...(byVendor.get(row.vendor_id) ?? []), row.rating]);
  }
  for (const [vendorId, ratings] of byVendor) {
    stats.set(vendorId, { average: summarise(ratings).average!, count: ratings.length });
  }
  return stats;
}

interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  customers: { name: string | null } | null;
}

/** One page of a vendor's published reviews, newest first, plus the overall summary. */
export async function listVendorReviews(vendorId: string, offset: number, limit: number): Promise<VendorReviewPage> {
  const db = supabase();
  const [all, page] = await Promise.all([
    db.from(TABLE).select("rating").eq("vendor_id", vendorId).eq("is_published", true),
    db
      .from(TABLE)
      .select("id, rating, comment, created_at, updated_at, customers ( name )")
      .eq("vendor_id", vendorId)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit),
  ]);

  if (missingTable(all.error) || missingTable(page.error)) {
    return { summary: summarise([]), reviews: [], nextOffset: null };
  }
  if (all.error) fail("review summary", all.error.message);
  if (page.error) fail("review list", page.error.message);

  // One extra row was requested to learn whether another page exists.
  const rows = page.data as unknown as ReviewRow[];
  const reviews: VendorReview[] = rows.slice(0, limit).map((row) => ({
    id: row.id,
    authorName: publicAuthorName(row.customers?.name ?? null),
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    // The updated_at trigger fires on edits; allow a little slack for the insert itself.
    edited: new Date(row.updated_at).getTime() - new Date(row.created_at).getTime() > 60_000,
  }));

  return {
    summary: summarise((all.data as { rating: number }[]).map((row) => row.rating)),
    reviews,
    nextOffset: rows.length > limit ? offset + limit : null,
  };
}

export interface ReviewableOrder {
  id: string;
  vendorId: string;
  status: OrderStatus;
}

/** The order behind a review, only if it belongs to this customer. */
export async function findReviewableOrder(orderCode: string, customerId: string): Promise<ReviewableOrder | null> {
  const { data, error } = await supabase()
    .from("orders")
    .select("id, vendor_id, status")
    .eq("order_code", orderCode)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) fail("review order lookup", error.message);
  if (!data) return null;
  const row = data as { id: string; vendor_id: string; status: string };
  return { id: row.id, vendorId: row.vendor_id, status: row.status as OrderStatus };
}

export async function findOrderReview(orderId: string): Promise<OrderReview | null> {
  const { data, error } = await supabase()
    .from(TABLE)
    .select("rating, comment, updated_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (missingTable(error)) return null;
  if (error) fail("review fetch", error.message);
  if (!data) return null;
  const row = data as { rating: number; comment: string | null; updated_at: string };
  return { rating: row.rating, comment: row.comment, updatedAt: row.updated_at };
}

/** Creates the review for an order, or updates it (one review per order). */
export async function saveOrderReview(
  order: ReviewableOrder,
  customerId: string,
  review: { rating: number; comment: string | null },
): Promise<OrderReview> {
  const { data, error } = await supabase()
    .from(TABLE)
    .upsert(
      { order_id: order.id, vendor_id: order.vendorId, customer_id: customerId, rating: review.rating, comment: review.comment },
      { onConflict: "order_id" },
    )
    .select("rating, comment, updated_at")
    .single();
  if (missingTable(error)) {
    throw new ServiceError("Reviews aren't available yet. Please try again later.", "unavailable");
  }
  if (error) fail("review save", error.message);
  const row = data as { rating: number; comment: string | null; updated_at: string };
  return { rating: row.rating, comment: row.comment, updatedAt: row.updated_at };
}
