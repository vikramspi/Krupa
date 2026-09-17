import { logActivity, shortName } from "@/server/activity";
import { loginSchema } from "@/server/authSchema";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { verifyPassword } from "@/server/password";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findCustomerByEmail, getCustomerById } from "@/server/repositories/customers";
import { newSession, writeSessionCookie } from "@/server/session";

/**
 * POST /api/auth/login — email + password.
 *
 * Issues exactly the same signed session cookie as the phone-OTP flow, so every
 * downstream check is unchanged. An email session carries no phone, which is what
 * keeps the "verify your phone before ordering" gate intact.
 */
const HOUR = 60 * 60 * 1000;
// Same message whatever the cause, so it never reveals which accounts exist or use Google.
const INVALID = "Email or password is incorrect. If you signed up with Google, use Continue with Google.";

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const ipLimit = rateLimit(`login:ip:${ip}`, 30, HOUR);
  if (!ipLimit.ok) return jsonError("Too many login attempts. Please try again later.", 429, "rate_limited", { retryAfter: ipLimit.retryAfter });

  const parsed = loginSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError(INVALID, 401, "unauthorised");

  const email = parsed.data.email.toLowerCase();
  const emailLimit = rateLimit(`login:email:${email}`, 10, HOUR);
  if (!emailLimit.ok) {
    return jsonError("Too many attempts for this account. Please try again later.", 429, "rate_limited", { retryAfter: emailLimit.retryAfter });
  }

  try {
    const row = await findCustomerByEmail(email);
    // Always runs bcrypt, even for unknown accounts, so timing doesn't leak existence.
    const passwordOk = await verifyPassword(parsed.data.password, row?.password_hash ?? null);
    if (!row || !passwordOk) return jsonError(INVALID, 401, "unauthorised");

    if (!row.email_verified_at) {
      return jsonError("Confirm your email address first — check your inbox for the link.", 403, "email_unverified");
    }

    await writeSessionCookie(newSession(row.phone, row.id));
    logActivity({
      actorType: "customer", actorId: row.id, actorLabel: shortName(row.name),
      action: "customer.signed_in", entityType: "customer", entityId: row.id,
      summary: `${shortName(row.name)} signed in with email`,
    });
    return Response.json({ customer: await getCustomerById(row.id) });
  } catch (error) {
    console.error("[auth] login failed", error);
    return jsonError("We couldn't sign you in. Please try again.", 500, "server_error");
  }
}
