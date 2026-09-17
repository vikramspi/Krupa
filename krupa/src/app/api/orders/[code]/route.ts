import { guardDatabase, jsonError, requireSession } from "@/server/http";
import { findOrderForCustomer } from "@/server/repositories/orders";
import { isValidOrderId, normalizeOrderId } from "@/lib/validation";
import { ServiceError } from "@/types";

/** GET /api/orders/{code} — one order, only if it belongs to the signed-in customer. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const auth = await requireSession();
  if (auth.response) return auth.response;

  const { code } = await params;
  if (!isValidOrderId(code)) return jsonError("That doesn't look like an order ID.", 400, "validation");

  try {
    const order = await findOrderForCustomer(normalizeOrderId(code), auth.session.customerId);
    // Same response whether it doesn't exist or belongs to someone else.
    if (!order) return jsonError("We couldn't find that order on your account.", 404, "not_found");
    return Response.json({ order });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[orders] fetch failed", error);
    return jsonError("We couldn't load that order.", 500, "server_error");
  }
}
