import { profileSchema } from "@/server/authSchema";
import { guardDatabase, jsonError, readJson, requireSession } from "@/server/http";
import { getCustomerById, updateCustomerName } from "@/server/repositories/customers";
import { ServiceError } from "@/types";

/** PATCH /api/customers/me — update the signed-in customer's name. */
export async function PATCH(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const auth = await requireSession();
  if (auth.response) return auth.response;

  const parsed = profileSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter your full name.", 400, "validation");

  try {
    await updateCustomerName(auth.session.customerId, parsed.data.name);
    return Response.json({ customer: await getCustomerById(auth.session.customerId) });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[customers] update failed", error);
    return jsonError("We couldn't save your details.", 500, "server_error");
  }
}
