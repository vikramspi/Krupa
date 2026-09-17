import "server-only";
import type { AdminVendor, AdminVendorSummary, OrderStatus } from "@/types";
import { supabase } from "../supabase";
import { fail, num } from "./shared";

interface Row {
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
  created_at: string;
}

const COLUMNS =
  "id, name, contact_phone, coverage_areas, offered_service_ids, turnaround_estimate, rating, is_active, price_multiplier, pickup_fee, latitude, longitude, accepts_same_day, created_at";

const toVendor = (row: Row): AdminVendor => ({
  id: row.id,
  name: row.name,
  contactPhone: row.contact_phone,
  coverageAreas: row.coverage_areas ?? [],
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
  const [vendors, orders, reviews, users] = await Promise.all([
    db.from("vendors").select(COLUMNS).order("name"),
    db.from("orders").select("vendor_id, status"),
    db.from("vendor_reviews").select("vendor_id, rating").eq("is_published", true),
    db.from("vendor_users").select("vendor_id").eq("is_active", true),
  ]);
  if (vendors.error) fail("vendor list", vendors.error.message);
  if (orders.error) fail("vendor order counts", orders.error.message);
  if (reviews.error) fail("vendor review stats", reviews.error.message);
  if (users.error) fail("vendor login counts", users.error.message);

  const orderRows = orders.data as { vendor_id: string; status: OrderStatus }[];
  const reviewRows = reviews.data as { vendor_id: string; rating: number }[];
  const userRows = users.data as { vendor_id: string }[];

  return (vendors.data as Row[]).map((row) => {
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
  const { data, error } = await supabase().from("vendors").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) fail("vendor fetch", error.message);
  return data ? toVendor(data as Row) : null;
}

export interface VendorInput {
  name: string;
  contactPhone: string;
  coverageAreas: string[];
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

const toColumns = (input: VendorInput) => ({
  name: input.name,
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
  const { data, error } = await supabase().from("vendors").insert(toColumns(input)).select(COLUMNS).single();
  if (error) fail("vendor create", error.message);
  return toVendor(data as Row);
}

export async function updateVendor(id: string, input: VendorInput): Promise<AdminVendor | null> {
  const { data, error } = await supabase().from("vendors").update(toColumns(input)).eq("id", id).select(COLUMNS).maybeSingle();
  if (error) fail("vendor update", error.message);
  return data ? toVendor(data as Row) : null;
}
