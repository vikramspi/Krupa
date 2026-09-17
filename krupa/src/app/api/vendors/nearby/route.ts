import { guardDatabase, jsonError } from "@/server/http";
import { getNetworkStats, listVendorsForArea } from "@/server/repositories/vendors";
import { matchVendors } from "@/lib/matching";
import { ServiceError } from "@/types";

/**
 * GET /api/vendors/nearby?areaId=&lat=&lng= — partners covering this area, ranked.
 * Inactive partners are returned too, flagged as at capacity, so the customer can
 * see who serves them and why they can't book right now.
 */
export async function GET(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const params = new URL(request.url).searchParams;
  const areaId = params.get("areaId");
  if (!areaId) return jsonError("A pickup area is required.", 400, "validation");

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const origin = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;

  try {
    const [vendors, stats] = await Promise.all([listVendorsForArea(areaId), getNetworkStats()]);
    return Response.json({ vendors: matchVendors(vendors, origin), evaluatedCount: stats.partnerCount });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[vendors] nearby failed", error);
    return jsonError("We couldn't load laundry partners.", 500, "server_error");
  }
}
