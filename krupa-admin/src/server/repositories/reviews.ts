import "server-only";
import type { AdminReview } from "@/types";
import { supabase } from "../supabase";
import { fail, PAGE_SIZE } from "./shared";

interface Row {
  id: string;
  rating: number;
  comment: string | null;
  is_published: boolean;
  created_at: string;
  vendor_id: string;
  customer_id: string;
  vendors: { name: string } | null;
  customers: { name: string | null } | null;
  orders: { order_code: string } | null;
}

export async function listReviews(filters: { vendorId?: string; hiddenOnly?: boolean; page: number }): Promise<{ reviews: AdminReview[]; total: number }> {
  let query = supabase()
    .from("vendor_reviews")
    .select("id, rating, comment, is_published, created_at, vendor_id, customer_id, vendors ( name ), customers ( name ), orders ( order_code )", { count: "exact" })
    .order("created_at", { ascending: false });
  if (filters.vendorId) query = query.eq("vendor_id", filters.vendorId);
  if (filters.hiddenOnly) query = query.eq("is_published", false);
  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) fail("review list", error.message);
  return {
    reviews: (data as unknown as Row[]).map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      isPublished: row.is_published,
      createdAt: row.created_at,
      orderCode: row.orders?.order_code ?? null,
      vendor: { id: row.vendor_id, name: row.vendors?.name ?? "—" },
      customer: { id: row.customer_id, name: row.customers?.name ?? null },
    })),
    total: count ?? 0,
  };
}

export async function setReviewPublished(id: string, isPublished: boolean): Promise<{ vendorId: string } | null> {
  const { data, error } = await supabase().from("vendor_reviews").update({ is_published: isPublished }).eq("id", id).select("vendor_id").maybeSingle();
  if (error) fail("review moderation", error.message);
  return data ? { vendorId: (data as { vendor_id: string }).vendor_id } : null;
}
