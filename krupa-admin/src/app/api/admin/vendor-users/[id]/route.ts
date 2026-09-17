import { z } from "zod";
import { logActivity } from "@/server/activity";
import { adminLabel, handle, jsonError, readJson, requireAdmin } from "@/server/http";
import { findVendorUser, setVendorUserActive } from "@/server/repositories/vendorUsers";

/** PATCH /api/admin/vendor-users/{id} — turn a partner login on or off (takes effect immediately). */
const schema = z.object({ isActive: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Invalid request.", 400, "validation");
  return handle("vendor login toggle", async () => {
    const user = await findVendorUser(id);
    if (!user) return jsonError("Login not found.", 404, "not_found");
    await setVendorUserActive(id, parsed.data.isActive);
    logActivity({
      actorType: "admin", actorId: auth.admin.email, actorLabel: adminLabel(auth.admin),
      action: parsed.data.isActive ? "vendor_user.enabled" : "vendor_user.disabled", entityType: "vendor", entityId: user.vendorId,
      summary: `Admin ${parsed.data.isActive ? "re-enabled" : "disabled"} partner login "${user.name}"`,
    });
    return Response.json({ ok: true });
  });
}
