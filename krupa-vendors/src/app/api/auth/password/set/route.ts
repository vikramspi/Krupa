import { z } from "zod";
import { logActivity } from "@/server/activity";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { resolveLink } from "@/server/linkTokens";
import { hashPassword } from "@/server/password";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findSessionUser, recordLogin, setPasswordAndClearLinks } from "@/server/repositories/vendorUsers";
import { writeSession } from "@/server/session";

/**
 * POST /api/auth/password/set — finish an invite or a reset: store the password,
 * burn the link, and sign the partner in.
 */
const schema = z.object({
  kind: z.enum(["invite", "reset"]),
  token: z.string().min(30).max(100),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  if (!rateLimit(`p-set:ip:${clientIp(request)}`, 20, 60 * 60 * 1000).ok) {
    return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Choose a password of at least 8 characters.", 400, "validation");

  try {
    const row = await resolveLink(parsed.data.kind, parsed.data.token);
    if (!row) return jsonError("This link has expired or was already used. Ask for a new one.", 410, "expired");

    await setPasswordAndClearLinks(row.id, await hashPassword(parsed.data.password));
    const user = await findSessionUser(row.id);
    if (!user) return jsonError("Your login isn't active. Please contact Krupa Laundry.", 403, "unauthorised");

    await writeSession(user.id, user.vendor.id);
    await recordLogin(user.id);
    logActivity({
      actorType: "vendor", actorId: user.id, actorLabel: `${user.name} (${user.vendor.name})`,
      action: parsed.data.kind === "invite" ? "vendor.invite_accepted" : "vendor.password_reset",
      entityType: "vendor", entityId: user.vendor.id,
      summary:
        parsed.data.kind === "invite"
          ? `${user.name} activated their partner login for ${user.vendor.name}`
          : `${user.name} (${user.vendor.name}) reset their password`,
    });
    return Response.json({ user });
  } catch (error) {
    console.error("[auth] partner set-password failed", error instanceof Error ? error.message : error);
    return jsonError("We couldn't save your password. Please try again.", 500, "server_error");
  }
}
