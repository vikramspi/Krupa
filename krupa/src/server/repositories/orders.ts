import "server-only";
import { getSlotTemplate } from "@/lib/schedule";
import { ServiceError, type Order, type OrderLine, type OrderStatus, type PickupAddress, type StatusEvent } from "@/types";
import { supabase } from "../supabase";
import type { OrderDraft } from "../buildOrder";
import { getReviewStats } from "./reviews";

interface OrderRow {
  order_code: string;
  customer_id: string | null;
  vendor_id: string;
  vendor_name: string;
  items: OrderLine[];
  subtotal: number;
  pickup_fee: number;
  discount: number;
  total: number;
  pickup_date: string;
  pickup_slot: string;
  address: PickupAddress;
  status: string;
  contact_email: string | null;
  instructions: string | null;
  estimated_delivery_from: string | null;
  estimated_delivery_to: string | null;
  status_history: StatusEvent[];
  created_at: string;
  customers?: { phone: string | null; name: string | null } | null;
  vendors?: { name: string; contact_phone: string; rating: number | string | null; pickup_fee: number } | null;
}

const SELECT = `order_code, customer_id, vendor_id, vendor_name, items, subtotal, pickup_fee, discount, total,
  pickup_date, pickup_slot, address, status, contact_email, instructions, estimated_delivery_from,
  estimated_delivery_to, status_history, created_at, customers ( phone, name ),
  vendors ( name, contact_phone, rating, pickup_fee )`;

function fail(action: string, message: string): never {
  console.error(`[db] ${action} failed`, { message });
  throw new ServiceError("We couldn't reach our servers. Please try again.", "network");
}

/** Rebuilds the app's Order shape from a row, re-hydrating partner details from the catalogue. */
function toOrder(row: OrderRow): Order {
  const itemCount = row.items.reduce((sum, line) => sum + line.quantity, 0);
  const rawRating = row.vendors?.rating ?? null;
  const rating = rawRating === null ? null : Number(rawRating);

  return {
    id: row.order_code,
    customerId: row.customer_id,
    contact: {
      name: row.customers?.name ?? "",
      phone: row.customers?.phone ?? "",
      email: row.contact_email ?? undefined,
    },
    vendor: {
      id: row.vendor_id,
      // Snapshot name, so a later rename doesn't rewrite history.
      name: row.vendor_name,
      phone: row.vendors?.contact_phone ?? "",
      rating,
    },
    address: row.address,
    pickup: {
      date: row.pickup_date,
      slotId: row.pickup_slot,
      slotLabel: getSlotTemplate(row.pickup_slot)?.label ?? row.pickup_slot,
    },
    lines: row.items,
    pricing: {
      subtotal: row.subtotal,
      pickupFee: row.pickup_fee,
      pickupFeeOriginal: row.vendors?.pickup_fee ?? row.pickup_fee,
      discount: row.discount,
      discountLabel: row.discount > 0 ? "Big bag offer · 10% off" : null,
      total: row.total,
      itemCount,
    },
    instructions: row.instructions ?? undefined,
    status: row.status as OrderStatus,
    statusHistory: row.status_history ?? [],
    createdAt: row.created_at,
    estimatedDelivery: {
      from: row.estimated_delivery_from ?? row.created_at,
      to: row.estimated_delivery_to ?? row.created_at,
    },
    paymentMethod: "pay_on_delivery",
  };
}

/** Shows the same partner rating as the booking flow: review average once reviews exist. */
async function withVendorRatings(orders: Order[]): Promise<Order[]> {
  const stats = await getReviewStats([...new Set(orders.map((order) => order.vendor.id))]);
  return orders.map((order) => {
    const reviews = stats.get(order.vendor.id);
    return reviews ? { ...order, vendor: { ...order.vendor, rating: reviews.average } } : order;
  });
}

/** Writes the order. Postgres assigns the order code from a sequence. */
export async function insertOrder(draft: OrderDraft, customerId: string): Promise<Order> {
  const { data, error } = await supabase()
    .from("orders")
    .insert({
      customer_id: customerId,
      vendor_id: draft.vendor.id,
      vendor_name: draft.vendor.name,
      items: draft.lines,
      subtotal: draft.pricing.subtotal,
      pickup_fee: draft.pricing.pickupFee,
      discount: draft.pricing.discount,
      total: draft.pricing.total,
      pickup_date: draft.pickup.date,
      pickup_slot: draft.pickup.slotId,
      address: draft.address,
      status: draft.status,
      contact_email: draft.contact.email ?? null,
      instructions: draft.instructions ?? null,
      estimated_delivery_from: draft.estimatedDelivery.from,
      estimated_delivery_to: draft.estimatedDelivery.to,
      status_history: draft.statusHistory,
    })
    .select(SELECT)
    .single();

  if (error) fail("order insert", error.message);
  return toOrder(data as unknown as OrderRow);
}

export async function listOrdersForCustomer(customerId: string): Promise<Order[]> {
  const { data, error } = await supabase()
    .from("orders")
    .select(SELECT)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });
  if (error) fail("order list", error.message);
  return withVendorRatings((data as unknown as OrderRow[]).map(toOrder));
}

/** Fetches one order only if it belongs to this customer. */
export async function findOrderForCustomer(orderCode: string, customerId: string): Promise<Order | null> {
  const { data, error } = await supabase()
    .from("orders")
    .select(SELECT)
    .eq("order_code", orderCode)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) fail("order fetch", error.message);
  if (!data) return null;
  const [order] = await withVendorRatings([toOrder(data as unknown as OrderRow)]);
  return order;
}

/** Guest tracking: the order code and the phone on the order must both match. */
export async function findOrderByCodeAndPhone(orderCode: string, phone: string): Promise<Order | null> {
  const { data, error } = await supabase().from("orders").select(SELECT).eq("order_code", orderCode).maybeSingle();
  if (error) fail("order lookup", error.message);
  if (!data) return null;
  const order = toOrder(data as unknown as OrderRow);
  if (order.contact.phone !== phone) return null;
  const [rated] = await withVendorRatings([order]);
  return rated;
}
