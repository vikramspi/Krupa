import { guardDatabase, jsonError } from "@/server/http";
import { findVendorById } from "@/server/repositories/vendors";
import { ServiceError } from "@/types";

/** GET /api/vendors/{id} */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const { id } = await params;
  try {
    const vendor = await findVendorById(id);
    if (!vendor) return jsonError("This laundry partner is no longer available.", 404, "not_found");
    return Response.json({ vendor });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[vendors] fetch failed", error);
    return jsonError("We couldn't load that partner.", 500, "server_error");
  }
}
