import { z } from "zod";
import { logActivity } from "@/server/activity";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { verifyPassword } from "@/server/password";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findSessionUser, findUserByEmail, recordLogin } from "@/server/repositories/vendorUsers";
import { writeSession } from "@/server/session";

/** POST /api/auth/login — partner email + password. Same message for every failure. */
const HOUR = 60 * 60 * 1000;
const INVALID = "Email or password is incorrect.";
const schema = z.object({ email: z.email().max(160), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  if (!rateLimit(`p-login:ip:${clientIp(request)}`, 30, HOUR).ok) {
    return jsonError("Too many login attempts. Please try again later.", 429, "rate_limited");
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(INVALID, 401, "unauthorised");
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`p-login:email:${email}`, 10, HOUR).ok) {
    return jsonError("Too many attempts for this account. Please try again later.", 429, "rate_limited");
  }

  try {
    const row = await findUserByEmail(email);
    // Always runs bcrypt, so response time doesn't reveal which emails exist.
    const ok = await verifyPassword(parsed.data.password, row?.password_hash ?? null);
    if (!row || !ok || !row.is_active) return jsonError(INVALID, 401, "unauthorised");

    const user = await findSessionUser(row.id);
    if (!user) return jsonError(INVALID, 401, "unauthorised");

    await writeSession(user.id, user.vendor.id);
    await recordLogin(user.id);
    logActivity({
      actorType: "vendor", actorId: user.id, actorLabel: `${user.name} (${user.vendor.name})`,
      action: "vendor.signed_in", entityType: "vendor", entityId: user.vendor.id,
      summary: `${user.name} signed in to the partner portal for ${user.vendor.name}`,
    });
    return Response.json({ user });
  } catch (error) {
    console.error("[auth] partner login failed", error instanceof Error ? error.message : error);
    return jsonError("We couldn't sign you in. Please try again.", 500, "server_error");
  }
}
