import { guardDatabase, jsonError, requireVendor } from "@/server/http";
import { allowedActions, nextAdvance } from "@/server/orderActions";
import { findVendorOrder } from "@/server/repositories/orders";
import { ServiceError } from "@/types";

const ORDER_CODE = /^KR-\d{5,8}$/;

/** GET /api/orders/{code} — one of the partner's own orders, with the actions available now. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  const auth = await requireVendor();
  if (auth.response) return auth.response;

  const code = (await params).code.toUpperCase();
  if (!ORDER_CODE.test(code)) return jsonError("That order doesn't exist.", 404, "not_found");
  try {
    const found = await findVendorOrder(auth.user.vendor.id, code);
    if (!found) return jsonError("That order isn't one of yours.", 404, "not_found");
    return Response.json({
      order: found.order,
      actions: allowedActions(found.order.status),
      nextStatus: nextAdvance(found.order.status),
    });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[orders] partner fetch failed", error);
    return jsonError("We couldn't load that order.", 500, "server_error");
  }
}
