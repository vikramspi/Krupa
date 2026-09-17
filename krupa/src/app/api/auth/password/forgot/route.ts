import { forgotPasswordSchema } from "@/server/authSchema";
import { sendPasswordReset, sendPasswordSetup } from "@/server/email";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findCustomerByEmail, passwordResetFingerprint } from "@/server/repositories/customers";
import { createActionToken, PASSWORD_RESET_TTL_MS } from "@/server/tokens";
import { siteConfig } from "@/lib/config";

/**
 * POST /api/auth/password/forgot — email a reset link.
 *
 * Responds identically whether or not the address exists, and is rate limited per
 * email and per IP so it can't be used to spam someone's inbox. The token is
 * never logged.
 */
const HOUR = 60 * 60 * 1000;
const GENERIC_OK = { ok: true, message: "If that email has an account, a reset link is on its way." };

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const ipLimit = rateLimit(`forgot:ip:${ip}`, 10, HOUR);
  if (!ipLimit.ok) return jsonError("Too many requests. Please try again later.", 429, "rate_limited", { retryAfter: ipLimit.retryAfter });

  const parsed = forgotPasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) return Response.json(GENERIC_OK);

  const email = parsed.data.email.toLowerCase();
  const emailLimit = rateLimit(`forgot:email:${email}`, 3, HOUR);
  if (!emailLimit.ok) return Response.json(GENERIC_OK);

  try {
    const row = await findCustomerByEmail(email);
    // A password account gets a reset link even before its email is confirmed: the
    // link can only be opened from the inbox, so completing it confirms the address
    // too. An account with no password (created with Google) gets a "you sign in with
    // Google" email that can also set a first one.
    if (row && (row.password_hash || row.email_verified_at)) {
      const token = createActionToken("reset_password", row.id, passwordResetFingerprint(row), PASSWORD_RESET_TTL_MS);
      const link = `${siteConfig.url}/reset-password?token=${token}`;
      const result = row.password_hash
        ? await sendPasswordReset(email, row.name ?? "", link)
        : await sendPasswordSetup(email, row.name ?? "", link);
      if (!result.sent) console.error("[auth] reset email failed", { customerId: row.id, error: result.error });
    }
  } catch (error) {
    console.error("[auth] forgot-password failed", error);
  }

  return Response.json(GENERIC_OK);
}
