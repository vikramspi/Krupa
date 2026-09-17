import "server-only";
import { catalogItems } from "@/data/catalog";
import { toDateKey } from "@/lib/format";
import { calculatePricing, priceForVendor } from "@/lib/pricing";
import { buildPickupSlots, effectiveTurnaround, estimateDeliveryWindow, isSlotBookable } from "@/lib/schedule";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";
import { ServiceError, type Order, type OrderLine, type Vendor } from "@/types";
import type { OrderRequest } from "./orderSchema";

/** An order with everything decided except its database-assigned code. */
export type OrderDraft = Omit<Order, "id">;

/**
 * Builds the authoritative order from an untrusted request.
 *
 * Item names, unit prices, the pickup fee, discounts and the delivery window are all
 * recomputed here from the catalogue — the client's totals are never persisted.
 * Throws `ServiceError` with a customer-safe message when the request can't be honoured.
 */
export function buildOrder(request: OrderRequest, vendor: Vendor, now = new Date()): OrderDraft {
  const phone = normalizePhone(request.contact.phone);
  if (!isValidIndianMobile(phone)) throw new ServiceError("Please provide a valid mobile number.", "validation");

  if (!vendor.isActive) throw new ServiceError("This partner is currently at capacity. Please choose another.", "unavailable");

  if (request.pickup.date < toDateKey(now)) {
    throw new ServiceError("That pickup date has passed. Please choose a new time.", "validation");
  }
  const slot = buildPickupSlots(vendor, request.pickup.date, now).find((s) => s.id === request.pickup.slotId);
  if (!slot || !isSlotBookable(slot)) {
    throw new ServiceError("That pickup slot was just taken. Please pick another time.", "unavailable");
  }

  // Collapse duplicate item ids, then re-price from the catalogue.
  const quantities = new Map<string, number>();
  for (const line of request.lines) {
    quantities.set(line.itemId, (quantities.get(line.itemId) ?? 0) + line.quantity);
  }

  const lines: OrderLine[] = [...quantities].map(([itemId, quantity]) => {
    const item = catalogItems.find((c) => c.id === itemId);
    if (!item || !vendor.services.includes(item.offeringId)) {
      throw new ServiceError("One of your items isn't offered by this partner.", "validation");
    }
    return { itemId, name: item.name, category: item.category, unitPrice: priceForVendor(item, vendor), quantity };
  });
  if (lines.length === 0) throw new ServiceError("Add at least one item to your order.", "validation");

  const pricing = calculatePricing(lines, vendor);
  const window = estimateDeliveryWindow(request.pickup.date, slot.id, effectiveTurnaround(vendor, lines));
  const at = (offsetSeconds: number) => new Date(now.getTime() + offsetSeconds * 1000).toISOString();

  return {
    customerId: request.customerId ?? null,
    contact: { name: request.contact.name.trim(), phone, email: request.contact.email?.trim() || undefined },
    vendor: { id: vendor.id, name: vendor.name, phone: vendor.contactPhone, rating: vendor.rating },
    address: { ...request.address, landmark: request.address.landmark?.trim() || undefined },
    pickup: { date: request.pickup.date, slotId: slot.id, slotLabel: slot.label },
    lines,
    pricing,
    instructions: request.instructions?.trim() || undefined,
    // The partner confirms from the vendor portal, which moves it to pickup_scheduled.
    status: "placed",
    statusHistory: [{ status: "placed", at: at(0), note: `Sent to ${vendor.name} for confirmation` }],
    createdAt: at(0),
    estimatedDelivery: { from: window.from.toISOString(), to: window.to.toISOString() },
    paymentMethod: "pay_on_delivery",
  };
}
