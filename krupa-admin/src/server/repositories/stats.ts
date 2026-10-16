import "server-only";
import { toDateKey, fromDateKey } from "@/lib/format";
import type { DashboardStats, OrderStatus } from "@/types";
import { supabase } from "../supabase";
import { fail } from "./shared";

const IN_PROGRESS: OrderStatus[] = ["vendor_assigned", "pickup_scheduled", "picked_up", "processing", "ready_for_delivery", "out_for_delivery"];
/** An order waiting this long for its partner needs the operator's attention. */
export const STALE_AWAITING_MINUTES = 30;

/**
 * Every delivered order's total, summed.
 *
 * PostgREST caps a response at db-max-rows (1000 here), so a plain select
 * silently stops counting once the business has done more than that — which is
 * exactly when the number starts to matter. Page until the rows run out.
 */
async function sumDeliveredRevenue(): Promise<{ count: number; revenue: number }> {
  const db = supabase();
  const PAGE = 1000;
  let count = 0;
  let revenue = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("orders")
      .select("total")
      .eq("status", "delivered")
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) fail("stats lifetime revenue", error.message);
    const rows = (data ?? []) as { total: number }[];
    count += rows.length;
    revenue += rows.reduce((sum, row) => sum + row.total, 0);
    if (rows.length < PAGE) return { count, revenue };
  }
}

export async function getDashboardStats(now = new Date()): Promise<DashboardStats> {
  const db = supabase();
  const startOfToday = fromDateKey(toDateKey(now)).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600e3).toISOString();
  const staleBefore = new Date(now.getTime() - STALE_AWAITING_MINUTES * 60e3).toISOString();
  const count = { count: "exact" as const, head: true };

  const [today, awaiting, stale, progress, delivered, customers, newCustomers, vendors, reviews] = await Promise.all([
    db.from("orders").select("id", count).gte("created_at", startOfToday),
    db.from("orders").select("id", count).eq("status", "placed"),
    db.from("orders").select("id", count).eq("status", "placed").lt("created_at", staleBefore),
    db.from("orders").select("id", count).in("status", IN_PROGRESS),
    db.from("orders").select("total").eq("status", "delivered").gte("updated_at", weekAgo),
    db.from("customers").select("id", count),
    db.from("customers").select("id", count).gte("created_at", weekAgo),
    db.from("vendors").select("is_active"),
    db.from("vendor_reviews").select("rating").eq("is_published", true),
  ]);
  const lifetime = await sumDeliveredRevenue();
  for (const [label, result] of Object.entries({ today, awaiting, stale, progress, delivered, customers, newCustomers, vendors, reviews })) {
    if (result.error) fail(`stats ${label}`, result.error.message);
  }

  const deliveredRows = (delivered.data ?? []) as { total: number }[];
  const vendorRows = (vendors.data ?? []) as { is_active: boolean }[];
  const ratings = ((reviews.data ?? []) as { rating: number }[]).map((r) => r.rating);

  return {
    ordersToday: today.count ?? 0,
    awaitingPartner: awaiting.count ?? 0,
    staleAwaiting: stale.count ?? 0,
    inProgress: progress.count ?? 0,
    deliveredLast7Days: deliveredRows.length,
    revenueLast7Days: deliveredRows.reduce((sum, row) => sum + row.total, 0),
    deliveredAllTime: lifetime.count,
    revenueAllTime: lifetime.revenue,
    customers: customers.count ?? 0,
    newCustomersLast7Days: newCustomers.count ?? 0,
    activeVendors: vendorRows.filter((v) => v.is_active).length,
    totalVendors: vendorRows.length,
    reviewAverage: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
    reviewCount: ratings.length,
  };
}
