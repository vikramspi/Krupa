import { guardDatabase, jsonError } from "@/server/http";
import { findVendorById } from "@/server/repositories/vendors";
import { catalogForVendor } from "@/server/vendorCatalog";
import { ServiceError } from "@/types";

/** GET /api/vendors/{id}/services — the catalogue priced for this partner. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const { id } = await params;
  try {
    const vendor = await findVendorById(id);
    if (!vendor) return jsonError("This laundry partner is no longer available.", 404, "not_found");
    return Response.json({ items: catalogForVendor(vendor) });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[vendors] services failed", error);
    return jsonError("We couldn't load this partner's prices.", 500, "server_error");
  }
}
