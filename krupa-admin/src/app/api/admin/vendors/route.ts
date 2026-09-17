import { logActivity } from "@/server/activity";
import { adminLabel, handle, jsonError, readJson, requireAdmin } from "@/server/http";
import { createVendor, listVendors } from "@/server/repositories/vendors";
import { firstIssue, vendorSchema } from "@/server/vendorSchema";

/** GET: all vendors with order/review/login counts. POST: add a vendor. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  return handle("vendors", async () => Response.json({ vendors: await listVendors() }));
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const parsed = vendorSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400, "validation");
  return handle("vendor create", async () => {
    const vendor = await createVendor(parsed.data);
    logActivity({
      actorType: "admin", actorId: auth.admin.email, actorLabel: adminLabel(auth.admin),
      action: "vendor.created", entityType: "vendor", entityId: vendor.id,
      summary: `Admin added vendor ${vendor.name} (${vendor.coverageAreas.length} areas)`,
    });
    return Response.json({ vendor }, { status: 201 });
  });
}
