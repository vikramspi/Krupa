import { forgotPasswordSchema } from "@/server/authSchema";
import { isEmailConfigured, sendEmailVerification } from "@/server/email";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { emailVerificationFingerprint, findCustomerByEmail } from "@/server/repositories/customers";
import { createActionToken, EMAIL_VERIFICATION_TTL_MS } from "@/server/tokens";
import { siteConfig } from "@/lib/config";

/**
 * POST /api/auth/verify-email/resend — send a fresh confirmation link.
 *
 * Same answer whether or not the address has an unconfirmed account, and rate
 * limited per email and per IP. The token is never logged.
 */
const HOUR = 60 * 60 * 1000;
const GENERIC_OK = { ok: true, message: "If that address has an unconfirmed account, a new link is on its way." };

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ipLimit = rateLimit(`resend-verify:ip:${clientIp(request)}`, 10, HOUR);
  if (!ipLimit.ok) return jsonError("Too many requests. Please try again later.", 429, "rate_limited", { retryAfter: ipLimit.retryAfter });

  const parsed = forgotPasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter a valid email address.", 400, "validation");
  if (!isEmailConfigured()) return jsonError("Email is unavailable right now. Please log in with your mobile number.", 503, "unavailable");

  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`resend-verify:email:${email}`, 3, HOUR).ok) return Response.json(GENERIC_OK);

  try {
    const row = await findCustomerByEmail(email);
    if (row && !row.email_verified_at) {
      const token = createActionToken("verify_email", row.id, emailVerificationFingerprint(row), EMAIL_VERIFICATION_TTL_MS);
      const result = await sendEmailVerification(email, row.name ?? "", `${siteConfig.url}/api/auth/verify-email?token=${token}`);
      if (!result.sent) console.error("[auth] verification resend failed", { customerId: row.id, error: result.error });
    }
  } catch (error) {
    console.error("[auth] verification resend failed", error);
  }
  return Response.json(GENERIC_OK);
}
