import { guardDatabase, jsonError, requireSession } from "@/server/http";
import { deleteCustomerAddress } from "@/server/repositories/customers";
import { ServiceError } from "@/types";

/** DELETE /api/customers/me/addresses/{id} */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const auth = await requireSession();
  if (auth.response) return auth.response;

  const { id } = await params;
  try {
    await deleteCustomerAddress(auth.session.customerId, id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[addresses] delete failed", error);
    return jsonError("We couldn't delete that address.", 500, "server_error");
  }
}
