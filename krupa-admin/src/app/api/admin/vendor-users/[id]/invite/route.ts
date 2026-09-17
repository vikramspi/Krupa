import { logActivity } from "@/server/activity";
import { INVITE_TTL_MS, sendPartnerInvite } from "@/server/email";
import { adminLabel, handle, jsonError, requireAdmin } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { findVendorUser, setInvite } from "@/server/repositories/vendorUsers";
import { findVendor } from "@/server/repositories/vendors";
import { newLinkToken } from "@/server/tokens";

/** POST /api/admin/vendor-users/{id}/invite — send a fresh invite (replaces any earlier link). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!rateLimit(`admin-invite:${id}`, 5, 60 * 60 * 1000).ok) return jsonError("Too many invites for this login. Try later.", 429, "rate_limited");
  return handle("vendor invite", async () => {
    const user = await findVendorUser(id);
    if (!user) return jsonError("Login not found.", 404, "not_found");
    if (!user.email) return jsonError("This login has no email. Partners with only a mobile number log in with an SMS code.", 400, "validation");
    if (!user.isActive) return jsonError("Enable this login before sending an invite.", 400, "validation");
    const vendor = await findVendor(user.vendorId);
    if (!vendor) return jsonError("Vendor not found.", 404, "not_found");

    const { token, hash } = newLinkToken();
    await setInvite(id, hash, new Date(Date.now() + INVITE_TTL_MS));
    const result = await sendPartnerInvite(user.email, user.name, vendor.name, token);
    if (!result.sent) return jsonError("The invite email couldn't be sent. Check the email settings.", 502, "network");

    logActivity({
      actorType: "admin", actorId: auth.admin.email, actorLabel: adminLabel(auth.admin),
      action: "vendor_user.invited", entityType: "vendor", entityId: user.vendorId,
      summary: `Admin sent a ${user.hasPassword ? "new password-setup" : "login"} invite to "${user.name}" (${vendor.name})`,
    });
    return Response.json({ ok: true });
  });
}
