import { addressSchema } from "@/server/authSchema";
import { guardDatabase, jsonError, readJson, requireSession } from "@/server/http";
import { saveCustomerAddress } from "@/server/repositories/customers";
import { ServiceError } from "@/types";

/** POST /api/customers/me/addresses — create, or update when an id is supplied. */
export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const auth = await requireSession();
  if (auth.response) return auth.response;

  const parsed = addressSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Please complete every required address field.", 400, "validation");

  try {
    // Scoped to the session's customer, so one customer can't write another's address.
    const address = await saveCustomerAddress(auth.session.customerId, parsed.data);
    return Response.json({ address }, { status: parsed.data.id ? 200 : 201 });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.code === "not_found" ? 404 : 503, error.code);
    console.error("[addresses] save failed", error);
    return jsonError("We couldn't save that address.", 500, "server_error");
  }
}
