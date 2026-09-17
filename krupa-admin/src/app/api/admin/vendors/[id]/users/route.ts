import { logActivity } from "@/server/activity";
import { INVITE_TTL_MS, isEmailConfigured, sendPartnerInvite } from "@/server/email";
import { adminLabel, handle, jsonError, readJson, requireAdmin } from "@/server/http";
import { createVendorUser, setInvite } from "@/server/repositories/vendorUsers";
import { findVendor } from "@/server/repositories/vendors";
import { newLinkToken } from "@/server/tokens";
import { firstIssue, vendorUserSchema } from "@/server/vendorSchema";

/**
 * POST /api/admin/vendors/{id}/users — add a partner login. With an email, an
 * invite link is sent so they can set their own password (we never choose one).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const body = (await readJson(request)) as Record<string, unknown> | null;
  const parsed = vendorUserSchema.safeParse({
    name: body?.name,
    phone: typeof body?.phone === "string" && body.phone.trim() ? body.phone.replace(/\D/g, "").slice(-10) : null,
    email: typeof body?.email === "string" && body.email.trim() ? body.email.trim() : null,
  });
  if (!parsed.success) return jsonError(firstIssue(parsed.error), 400, "validation");
  if (parsed.data.email && !isEmailConfigured()) {
    return jsonError("Email isn't set up, so an invite can't be sent. Add a mobile number instead.", 503, "unavailable");
  }

  return handle("vendor login create", async () => {
    const vendor = await findVendor(id);
    if (!vendor) return jsonError("Vendor not found.", 404, "not_found");
    const user = await createVendorUser(id, parsed.data);

    let inviteSent = false;
    if (user.email) {
      const { token, hash } = newLinkToken();
      await setInvite(user.id, hash, new Date(Date.now() + INVITE_TTL_MS));
      const result = await sendPartnerInvite(user.email, user.name, vendor.name, token);
      inviteSent = result.sent;
      if (!result.sent) console.error("[admin] invite email failed", { userId: user.id, error: result.error ?? result.skipped });
    }

    logActivity({
      actorType: "admin", actorId: auth.admin.email, actorLabel: adminLabel(auth.admin),
      action: "vendor_user.created", entityType: "vendor", entityId: id,
      summary: `Admin added login "${user.name}" for ${vendor.name}${user.email ? (inviteSent ? " and sent an invite" : " (invite email failed)") : ""}`,
    });
    return Response.json({ user: { ...user, invitePending: inviteSent }, inviteSent }, { status: 201 });
  });
}
