import { orderLookupSchema } from "@/server/authSchema";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findOrderByCodeAndPhone } from "@/server/repositories/orders";
import { isValidOrderId, normalizeOrderId, normalizePhone } from "@/lib/validation";
import { ServiceError } from "@/types";

/**
 * POST /api/orders/lookup — guest tracking with order code + mobile number.
 * Rate limited, and deliberately returns one message for "wrong code" and
 * "wrong number" so order codes can't be probed.
 */
const NOT_FOUND = "We couldn't find an order matching that ID and mobile number.";

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const limit = rateLimit(`lookup:ip:${ip}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many lookups. Please try again later.", 429, "rate_limited", { retryAfter: limit.retryAfter });

  const parsed = orderLookupSchema.safeParse(await readJson(request));
  if (!parsed.success || !isValidOrderId(parsed.data.orderCode)) {
    return jsonError(NOT_FOUND, 404, "not_found");
  }

  try {
    const order = await findOrderByCodeAndPhone(normalizeOrderId(parsed.data.orderCode), normalizePhone(parsed.data.phone));
    if (!order) return jsonError(NOT_FOUND, 404, "not_found");
    return Response.json({ order });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[orders] lookup failed", error);
    return jsonError("We couldn't look up that order.", 500, "server_error");
  }
}
