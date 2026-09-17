import { guardDatabase, jsonError } from "@/server/http";
import { findVendorById } from "@/server/repositories/vendors";
import { buildPickupSlots } from "@/lib/schedule";
import { ServiceError } from "@/types";

/** GET /api/vendors/{id}/pickup-slots?date=yyyy-mm-dd */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonError("A pickup date is required.", 400, "validation");

  const { id } = await params;
  try {
    const vendor = await findVendorById(id);
    if (!vendor) return jsonError("This laundry partner is no longer available.", 404, "not_found");
    if (!vendor.isActive) return jsonError("This partner is currently at capacity.", 409, "unavailable");
    return Response.json({ slots: buildPickupSlots(vendor, date) });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[vendors] slots failed", error);
    return jsonError("We couldn't load pickup times.", 500, "server_error");
  }
}
