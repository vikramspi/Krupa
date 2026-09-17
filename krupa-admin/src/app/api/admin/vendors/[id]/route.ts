import { logActivity } from "@/server/activity";
import { adminLabel, handle, jsonError, readJson, requireAdmin } from "@/server/http";
import { listVendorUsers } from "@/server/repositories/vendorUsers";
import { findVendor, updateVendor } from "@/server/repositories/vendors";
import { firstIssue, vendorSchema } from "@/server/vendorSchema";

const UUID = /^[0-9a-f-]{36}$/i;

/** GET: one vendor with its logins. PATCH: save changes (the full vendor form). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Vendor not found.", 404, "not_found");
  return handle("vendor", async () => {
    const vendor = await findVendor(id);
    if (!vendor) return jsonError("Vendor not found.", 404, "not_found");
    return Response.json({ vendor, users: await listVendorUsers(id) });
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!UUID.test(id)) return jsonError("Vendor not found.", 404, "not_found");
  const parsed = vendorSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400, "validation");
  return handle("vendor update", async () => {
    const before = await findVendor(id);
    if (!before) return jsonError("Vendor not found.", 404, "not_found");
    const vendor = await updateVendor(id, parsed.data);
    if (!vendor) return jsonError("Vendor not found.", 404, "not_found");

    const changed = (Object.keys(parsed.data) as (keyof typeof parsed.data)[]).filter(
      (key) => JSON.stringify(before[key as keyof typeof before]) !== JSON.stringify(vendor[key as keyof typeof vendor]),
    );
    const pausedChange = before.isActive !== vendor.isActive ? (vendor.isActive ? " — now taking orders" : " — paused") : "";
    logActivity({
      actorType: "admin", actorId: auth.admin.email, actorLabel: adminLabel(auth.admin),
      action: "vendor.updated", entityType: "vendor", entityId: id,
      summary: `Admin updated ${vendor.name}${pausedChange}${changed.length ? ` (${changed.join(", ")})` : ""}`,
      details: { changed },
    });
    return Response.json({ vendor });
  });
}
