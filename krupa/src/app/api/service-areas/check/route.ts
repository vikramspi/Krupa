import { jsonError } from "@/server/http";
import { countVendorsForArea } from "@/server/repositories/vendors";
import { checkAreaCoverage } from "@/lib/serviceAreas";
import { isDatabaseConfigured } from "@/server/env";

/**
 * GET /api/service-areas/check?q= — is this address served, and by how many partners?
 * Area coverage comes from the local area list; the partner count comes from the
 * vendors table, so "coming soon" reflects reality as partners are added.
 */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (!query) return jsonError("Enter an area or pincode.", 400, "validation");

  const result = checkAreaCoverage(query);
  if (result.status !== "supported") return Response.json({ result });

  // Unknown counts (database down) are reported as "has partners" so the UI never
  // tells someone we don't serve them just because a lookup failed.
  let counts = { total: 1, active: 1 };
  if (isDatabaseConfigured()) {
    try {
      counts = await countVendorsForArea(result.area.id);
    } catch (error) {
      console.error("[service-areas] partner count failed", error);
    }
  }
  return Response.json({ result: { ...result, partnerCount: counts.active, hasPartners: counts.total > 0 } });
}
