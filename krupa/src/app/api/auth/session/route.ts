import { guardDatabase, jsonError } from "@/server/http";
import { getCustomerById } from "@/server/repositories/customers";
import { clearSessionCookie, readSession } from "@/server/session";
import { ServiceError } from "@/types";

/** GET /api/auth/session — the signed-in customer, or null. */
export async function GET() {
  const session = await readSession();
  if (!session) return Response.json({ customer: null });

  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  try {
    const customer = await getCustomerById(session.customerId);
    if (!customer) {
      // Row removed since the cookie was issued — drop the stale session.
      await clearSessionCookie();
      return Response.json({ customer: null });
    }
    return Response.json({ customer });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[session] fetch failed", error);
    return jsonError("We couldn't load your account.", 500, "server_error");
  }
}

/** DELETE /api/auth/session — sign out. */
export async function DELETE() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
