import "server-only";
import { PICKUP_SLOT_LABELS } from "@/lib/slots";
import { ServiceError, type OrderLine, type OrderStatus, type PickupAddress, type StatusEvent, type VendorOrder } from "@/types";
import { supabase } from "../supabase";

/**
 * Orders as a partner sees them. Every query is scoped to the partner's own
 * vendor_id — a partner can never read or change another partner's order.
 */
interface OrderRow {
  id: string;
  order_code: string;
  status: OrderStatus;
  created_at: string;
  items: OrderLine[];
  subtotal: number;
  pickup_fee: number;
  discount: number;
  total: number;
  pickup_date: string;
  pickup_slot: string;
  address: PickupAddress;
  contact_email: string | null;
  instructions: string | null;
  estimated_delivery_from: string | null;
  estimated_delivery_to: string | null;
  status_history: StatusEvent[] | null;
  customers: { name: string | null; phone: string | null } | null;
}

const SELECT = `id, order_code, status, created_at, items, subtotal, pickup_fee, discount, total, pickup_date,
  pickup_slot, address, contact_email, instructions, estimated_delivery_from, estimated_delivery_to,
  status_history, customers ( name, phone )`;

function fail(action: string, message: string): never {
  console.error(`[db] ${action} failed`, { message });
  throw new ServiceError("We couldn't reach our servers. Please try again.", "network");
}

function toVendorOrder(row: OrderRow): VendorOrder {
  return {
    code: row.order_code,
    status: row.status,
    createdAt: row.created_at,
    customer: { name: row.customers?.name ?? "Customer", phone: row.customers?.phone ?? "" },
    address: row.address,
    instructions: row.instructions,
    pickup: { date: row.pickup_date, slotId: row.pickup_slot, slotLabel: PICKUP_SLOT_LABELS[row.pickup_slot] ?? row.pickup_slot },
    estimatedDelivery: { from: row.estimated_delivery_from, to: row.estimated_delivery_to },
    items: row.items ?? [],
    pricing: {
      subtotal: row.subtotal,
      pickupFee: row.pickup_fee,
      discount: row.discount,
      total: row.total,
      itemCount: (row.items ?? []).reduce((sum, line) => sum + line.quantity, 0),
    },
    history: row.status_history ?? [],
  };
}

export type OrderTab = "new" | "active" | "done";

const TAB_STATUSES: Record<OrderTab, OrderStatus[]> = {
  new: ["placed"],
  active: ["vendor_assigned", "pickup_scheduled", "picked_up", "processing", "ready_for_delivery", "out_for_delivery"],
  done: ["delivered", "cancelled"],
};

export async function listVendorOrders(vendorId: string, tab: OrderTab, limit = 50): Promise<VendorOrder[]> {
  let query = supabase().from("orders").select(SELECT).eq("vendor_id", vendorId).in("status", TAB_STATUSES[tab]);
  // New and active: soonest pickup first. Done: most recent first.
  query =
    tab === "done"
      ? query.order("updated_at", { ascending: false })
      : query.order("pickup_date", { ascending: true }).order("created_at", { ascending: true });
  const { data, error } = await query.limit(limit);
  if (error) fail("partner order list", error.message);
  return (data as unknown as OrderRow[]).map(toVendorOrder);
}

export async function countVendorOrders(vendorId: string): Promise<Record<OrderTab, number>> {
  const { data, error } = await supabase()
    .from("orders")
    .select("status")
    .eq("vendor_id", vendorId)
    .in("status", [...TAB_STATUSES.new, ...TAB_STATUSES.active]);
  if (error) fail("partner order counts", error.message);
  const statuses = (data as { status: OrderStatus }[]).map((row) => row.status);
  return {
    new: statuses.filter((s) => TAB_STATUSES.new.includes(s)).length,
    active: statuses.filter((s) => TAB_STATUSES.active.includes(s)).length,
    done: 0,
  };
}

export interface OrderWithContact {
  id: string;
  order: VendorOrder;
  contactEmail: string | null;
}

export async function findVendorOrder(vendorId: string, orderCode: string): Promise<OrderWithContact | null> {
  const { data, error } = await supabase()
    .from("orders")
    .select(SELECT)
    .eq("vendor_id", vendorId)
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) fail("partner order fetch", error.message);
  if (!data) return null;
  const row = data as unknown as OrderRow;
  return { id: row.id, order: toVendorOrder(row), contactEmail: row.contact_email };
}

/**
 * Moves an order on, but only if it is still in `from` — two people acting on the
 * same order at once can't both win. Returns false when it had already changed.
 */
export async function transitionOrder(
  vendorId: string,
  orderId: string,
  from: OrderStatus,
  to: OrderStatus,
  events: StatusEvent[],
  history: StatusEvent[],
): Promise<boolean> {
  const { data, error } = await supabase()
    .from("orders")
    .update({ status: to, status_history: [...history, ...events] })
    .eq("id", orderId)
    .eq("vendor_id", vendorId)
    .eq("status", from)
    .select("id");
  if (error) fail("partner order update", error.message);
  return (data ?? []).length === 1;
}
