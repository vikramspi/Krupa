import { logActivity, shortName } from "@/server/activity";
import { after } from "next/server";
import { buildOrder } from "@/server/buildOrder";
import { sendCustomerOrderEmail, sendOperatorOrderEmail } from "@/server/email";
import { guardDatabase, jsonError, readJson, requireSession } from "@/server/http";
import { orderRequestSchema } from "@/server/orderSchema";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { insertOrder, listOrdersForCustomer } from "@/server/repositories/orders";
import { findVendorById } from "@/server/repositories/vendors";
import { normalizePhone } from "@/lib/validation";
import { ServiceError } from "@/types";

/**
 * POST /api/orders — the authoritative order-creation endpoint.
 *
 *   1. requires a verified session (phone OTP)   4. writes the order to Postgres (source of truth)
 *   2. rate limits by IP and phone               5. emails the operator + customer (after responding)
 *   3. recomputes pricing from item IDs
 *
 * GET /api/orders — the signed-in customer's order history.
 */
const HOUR = 60 * 60 * 1000;
const MAX_ORDERS_PER_IP_PER_HOUR = 10;
const MAX_ORDERS_PER_PHONE_PER_HOUR = 5;

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const auth = await requireSession();
  if (auth.response) return auth.response;
  const { session } = auth;

  // Email+password sessions carry no phone: the phone gate applies either way.
  if (!session.phone) {
    return jsonError("Please verify your mobile number before placing an order.", 403, "phone_required");
  }

  const ip = clientIp(request);
  const ipLimit = rateLimit(`order:ip:${ip}`, MAX_ORDERS_PER_IP_PER_HOUR, HOUR);
  if (!ipLimit.ok) {
    return jsonError("Too many orders from this connection. Please try again later.", 429, "rate_limited", {
      retryAfter: ipLimit.retryAfter,
    });
  }

  const parsed = orderRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    console.warn("[orders] rejected invalid payload", { ip, issues: parsed.error.issues.slice(0, 5) });
    return jsonError("Some of your order details look invalid. Please check and try again.", 400, "validation");
  }

  // Honeypot: hidden field, only a bot fills it in.
  if (parsed.data.website) {
    console.warn("[orders] honeypot triggered", { ip });
    return jsonError("We couldn't place your order. Please try again.", 400, "rejected");
  }

  // The order is always placed against the verified number on the session.
  if (normalizePhone(parsed.data.contact.phone) !== session.phone) {
    return jsonError("Orders must be placed with your verified mobile number.", 403, "unauthorised");
  }

  const phoneLimit = rateLimit(`order:phone:${session.phone}`, MAX_ORDERS_PER_PHONE_PER_HOUR, HOUR);
  if (!phoneLimit.ok) {
    return jsonError("You've placed several orders recently. Please call us to book another.", 429, "rate_limited", {
      retryAfter: phoneLimit.retryAfter,
    });
  }

  let order;
  try {
    const vendor = await findVendorById(parsed.data.vendorId);
    if (!vendor) return jsonError("This laundry partner is no longer available.", 404, "not_found");

    const draft = buildOrder({ ...parsed.data, customerId: session.customerId }, vendor);

    // A mismatch means the UI showed a price the server disagrees with — the server total wins.
    if (parsed.data.clientTotal !== undefined && parsed.data.clientTotal !== draft.pricing.total) {
      console.warn("[orders] client/server total mismatch", {
        clientTotal: parsed.data.clientTotal,
        serverTotal: draft.pricing.total,
      });
    }

    order = await insertOrder(draft, session.customerId);
  } catch (error) {
    if (error instanceof ServiceError) {
      console.warn("[orders] rejected", { code: error.code, reason: error.message });
      const status = error.code === "unavailable" ? 409 : error.code === "network" ? 503 : 422;
      return jsonError(error.message, status, error.code);
    }
    console.error("[orders] create failed", error);
    return jsonError("We couldn't place your order. Please try again.", 500, "server_error");
  }

  // The order is already durably stored, so the customer gets their confirmation
  // now; the emails go out after the response (a failed email never fails the order).
  const placed = order;
  logActivity({
    actorType: "customer", actorId: session.customerId, actorLabel: shortName(placed.contact.name),
    action: "order.placed", entityType: "order", entityId: placed.id,
    summary: `${shortName(placed.contact.name)} placed ${placed.id} with ${placed.vendor.name} (₹${placed.pricing.total})`,
    details: { vendorId: placed.vendor.id, total: placed.pricing.total, items: placed.pricing.itemCount, area: placed.address.areaName, pickup: `${placed.pickup.date} ${placed.pickup.slotLabel}` },
  });
  after(async () => {
    const [operatorEmail, customerEmail] = await Promise.all([sendOperatorOrderEmail(placed), sendCustomerOrderEmail(placed)]);
    console.info("[orders] created", {
      id: placed.id,
      vendor: placed.vendor.id,
      items: placed.pricing.itemCount,
      total: placed.pricing.total,
      operatorEmail: operatorEmail.sent ? "sent" : (operatorEmail.skipped ?? operatorEmail.error),
      customerEmail: customerEmail.sent ? "sent" : (customerEmail.skipped ?? customerEmail.error),
    });
    if (!operatorEmail.sent && !operatorEmail.skipped) {
      console.error("[orders] operator notification FAILED", { id: placed.id, error: operatorEmail.error });
    }
  });

  return Response.json({ order }, { status: 201 });
}

export async function GET() {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    return Response.json({ orders: await listOrdersForCustomer(auth.session.customerId) });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[orders] list failed", error);
    return jsonError("We couldn't load your orders.", 500, "server_error");
  }
}
