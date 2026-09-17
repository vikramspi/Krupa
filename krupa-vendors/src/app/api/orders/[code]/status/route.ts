import { after } from "next/server";
import { z } from "zod";
import { logActivity } from "@/server/activity";
import { sendCustomerCancelled, sendCustomerDelivered, sendOperatorDeclined } from "@/server/email";
import { guardDatabase, jsonError, readJson, requireVendor } from "@/server/http";
import { allowedActions, applyAction, nextAdvance } from "@/server/orderActions";
import { rateLimit } from "@/server/rateLimit";
import { findVendorOrder, transitionOrder } from "@/server/repositories/orders";
import { ServiceError } from "@/types";

/**
 * POST /api/orders/{code}/status — accept, decline or move an order to its next step.
 *
 * `from` is the status the partner was looking at: if the order changed in the
 * meantime the request fails with 409 instead of skipping a step.
 */
const ORDER_CODE = /^KR-\d{5,8}$/;
const schema = z.object({
  action: z.enum(["accept", "decline", "advance"]),
  from: z.string().min(1).max(40),
  reason: z.string().trim().min(3).max(200).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  const auth = await requireVendor();
  if (auth.response) return auth.response;
  const { user } = auth;

  if (!rateLimit(`p-status:${user.id}`, 200, 60 * 60 * 1000).ok) {
    return jsonError("Too many updates. Please wait a moment.", 429, "rate_limited");
  }
  const code = (await params).code.toUpperCase();
  if (!ORDER_CODE.test(code)) return jsonError("That order doesn't exist.", 404, "not_found");
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("That update isn't valid.", 400, "validation");
  const { action, from } = parsed.data;
  const reason = parsed.data.reason ?? null;
  if (action === "decline" && !reason) return jsonError("Tell the customer why you can't take this order.", 400, "validation");

  try {
    const found = await findVendorOrder(user.vendor.id, code);
    if (!found) return jsonError("That order isn't one of yours.", 404, "not_found");
    const { order } = found;

    if (order.status !== from || !allowedActions(order.status).includes(action)) {
      return jsonError("This order was already updated. Refresh to see its latest status.", 409, "conflict");
    }
    const change = applyAction(order, action, user.vendor.name, reason);
    if (!change) return jsonError("That update isn't possible right now.", 409, "conflict");

    const moved = await transitionOrder(user.vendor.id, found.id, order.status, change.to, change.events, order.history);
    if (!moved) return jsonError("This order was already updated. Refresh to see its latest status.", 409, "conflict");

    const updated = { ...order, status: change.to, history: [...order.history, ...change.events] };
    logActivity({
      actorType: "vendor", actorId: user.id, actorLabel: `${user.name} (${user.vendor.name})`,
      action: `order.${action === "advance" ? change.to : action === "accept" ? "accepted" : "declined"}`,
      entityType: "order", entityId: code,
      summary:
        action === "accept"
          ? `${user.vendor.name} accepted ${code}`
          : action === "decline"
            ? `${user.vendor.name} declined ${code}: ${reason}`
            : `${user.vendor.name} marked ${code} as ${change.to.replace(/_/g, " ")}`,
      details: { from: order.status, to: change.to, ...(reason ? { reason } : {}) },
    });

    after(async () => {
      if (change.to === "cancelled" && reason) {
        await Promise.all([
          sendCustomerCancelled(found.contactEmail, updated, user.vendor.name, reason),
          sendOperatorDeclined(updated, user.vendor.name, reason),
        ]);
      }
      if (change.to === "delivered") await sendCustomerDelivered(found.contactEmail, updated, user.vendor.name);
    });

    return Response.json({ order: updated, actions: allowedActions(updated.status), nextStatus: nextAdvance(updated.status) });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[orders] partner status update failed", error);
    return jsonError("We couldn't update that order. Please try again.", 500, "server_error");
  }
}
