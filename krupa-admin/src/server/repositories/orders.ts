import "server-only";
import { PICKUP_SLOT_LABELS } from "@/lib/slots";
import type { AdminOrder, AdminOrderRow, OrderLine, OrderStatus, PickupAddress, StatusEvent } from "@/types";
import { supabase } from "../supabase";
import { fail, likeTerm, PAGE_SIZE } from "./shared";

interface ListRow {
  order_code: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  vendor_id: string;
  vendor_name: string;
  customer_id: string | null;
  address: PickupAddress;
  pickup_date: string;
  pickup_slot: string;
  total: number;
  items: OrderLine[];
  customers: { name: string | null; phone: string | null } | null;
}

const LIST_SELECT = "order_code, status, created_at, updated_at, vendor_id, vendor_name, customer_id, address, pickup_date, pickup_slot, total, items, customers ( name, phone )";

const toRow = (row: ListRow): AdminOrderRow => ({
  code: row.order_code,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  vendor: { id: row.vendor_id, name: row.vendor_name },
  customer: { id: row.customer_id, name: row.customers?.name ?? "—", phone: row.customers?.phone ?? "" },
  area: row.address?.areaName ?? "",
  pickup: { date: row.pickup_date, slotLabel: PICKUP_SLOT_LABELS[row.pickup_slot] ?? row.pickup_slot },
  total: row.total,
  itemCount: (row.items ?? []).reduce((sum, line) => sum + line.quantity, 0),
});

export interface OrderFilters {
  status?: OrderStatus | "open";
  vendorId?: string;
  customerId?: string;
  search?: string;
  page: number;
}

export async function listOrders(filters: OrderFilters): Promise<{ orders: AdminOrderRow[]; total: number }> {
  let query = supabase().from("orders").select(LIST_SELECT, { count: "exact" }).order("created_at", { ascending: false });
  if (filters.status === "open") query = query.not("status", "in", "(delivered,cancelled)");
  else if (filters.status) query = query.eq("status", filters.status);
  if (filters.vendorId) query = query.eq("vendor_id", filters.vendorId);
  if (filters.customerId) query = query.eq("customer_id", filters.customerId);
  if (filters.search) {
    const term = filters.search.trim();
    const digits = term.replace(/\D/g, "");
    // Order code, or the phone of the customer who placed it.
    if (/^kr/i.test(term) || /^\d{4,8}$/.test(digits) && digits.length < 10) {
      query = query.ilike("order_code", likeTerm(digits || term));
    } else if (digits.length >= 10) {
      const { data, error } = await supabase().from("customers").select("id").eq("phone", digits.slice(-10));
      if (error) fail("order search phone", error.message);
      const ids = (data as { id: string }[]).map((c) => c.id);
      query = ids.length ? query.in("customer_id", ids) : query.eq("customer_id", "00000000-0000-0000-0000-000000000000");
    } else {
      query = query.or(`vendor_name.ilike.${likeTerm(term)},instructions.ilike.${likeTerm(term)}`);
    }
  }
  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) fail("order list", error.message);
  return { orders: (data as unknown as ListRow[]).map(toRow), total: count ?? 0 };
}

interface DetailRow extends ListRow {
  id: string;
  subtotal: number;
  pickup_fee: number;
  discount: number;
  contact_email: string | null;
  instructions: string | null;
  estimated_delivery_from: string | null;
  estimated_delivery_to: string | null;
  status_history: StatusEvent[] | null;
  vendors: { contact_phone: string } | null;
}

export async function findOrder(code: string): Promise<AdminOrder | null> {
  const { data, error } = await supabase()
    .from("orders")
    .select(`${LIST_SELECT}, id, subtotal, pickup_fee, discount, contact_email, instructions, estimated_delivery_from, estimated_delivery_to, status_history, vendors ( contact_phone )`)
    .eq("order_code", code)
    .maybeSingle();
  if (error) fail("order fetch", error.message);
  if (!data) return null;
  const row = data as unknown as DetailRow;

  const review = await supabase().from("vendor_reviews").select("rating, comment, is_published").eq("order_id", row.id).maybeSingle();
  if (review.error && review.error.code !== "PGRST205") fail("order review", review.error.message);
  const r = review.data as { rating: number; comment: string | null; is_published: boolean } | null;

  const items = row.items ?? [];
  return {
    id: row.id,
    code: row.order_code,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerId: row.customer_id,
    customer: { name: row.customers?.name ?? "—", phone: row.customers?.phone ?? "" },
    contactEmail: row.contact_email,
    vendor: { id: row.vendor_id, name: row.vendor_name, phone: row.vendors?.contact_phone ?? "" },
    address: row.address,
    instructions: row.instructions,
    pickup: { date: row.pickup_date, slotId: row.pickup_slot, slotLabel: PICKUP_SLOT_LABELS[row.pickup_slot] ?? row.pickup_slot },
    estimatedDelivery: { from: row.estimated_delivery_from, to: row.estimated_delivery_to },
    items,
    pricing: {
      subtotal: row.subtotal,
      pickupFee: row.pickup_fee,
      discount: row.discount,
      total: row.total,
      itemCount: items.reduce((sum, line) => sum + line.quantity, 0),
    },
    history: row.status_history ?? [],
    review: r ? { rating: r.rating, comment: r.comment, isPublished: r.is_published } : null,
  };
}

/** Operator override: any status, recorded in the customer-visible history with a note. */
export async function setOrderStatus(order: AdminOrder, to: OrderStatus, note: string | null): Promise<boolean> {
  const event: StatusEvent = { status: to, at: new Date().toISOString(), ...(note ? { note } : {}) };
  const { data, error } = await supabase()
    .from("orders")
    .update({ status: to, status_history: [...order.history, event] })
    .eq("id", order.id)
    .eq("status", order.status)
    .select("id");
  if (error) fail("order status override", error.message);
  return (data ?? []).length === 1;
}
