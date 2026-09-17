import { logActivity, shortName } from "@/server/activity";
import { registerSchema } from "@/server/authSchema";
import { isEmailConfigured, sendEmailVerification } from "@/server/email";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { createEmailCustomer, emailVerificationFingerprint, findCustomerByEmail } from "@/server/repositories/customers";
import { hashPassword } from "@/server/password";
import { createActionToken, EMAIL_VERIFICATION_TTL_MS } from "@/server/tokens";
import { siteConfig } from "@/lib/config";

/**
 * POST /api/auth/register — create an email + password account.
 *
 * The account cannot log in until the emailed verification link is clicked.
 * The response is deliberately identical whether or not the address was already
 * registered, so this endpoint can't be used to enumerate customers.
 */
const HOUR = 60 * 60 * 1000;
const GENERIC_OK = { ok: true, message: "Check your email for a confirmation link." };

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const limit = rateLimit(`register:ip:${ip}`, 10, HOUR);
  if (!limit.ok) return jsonError("Too many sign-up attempts. Please try again later.", 429, "rate_limited", { retryAfter: limit.retryAfter });

  const parsed = registerSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return jsonError("Enter your name, a valid email address and a password of at least 8 characters.", 400, "validation");
  }

  // Without email delivery the account could never be verified, so refuse up front.
  if (!isEmailConfigured()) {
    console.error("[auth] register blocked — Resend is not configured");
    return jsonError("Email sign-up is unavailable right now. Please continue with your mobile number.", 503, "unavailable");
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const existing = await findCustomerByEmail(email);

    // Already verified: say nothing. Unverified: re-send the link.
    if (existing?.email_verified_at) return Response.json(GENERIC_OK);

    const row = existing ?? (await createEmailCustomer(email, await hashPassword(parsed.data.password), parsed.data.name));
    if (!existing) {
      logActivity({
        actorType: "customer", actorId: row.id, actorLabel: shortName(row.name),
        action: "customer.signed_up", entityType: "customer", entityId: row.id,
        summary: `New customer signed up with email (awaiting confirmation)`,
      });
    }
    const token = createActionToken("verify_email", row.id, emailVerificationFingerprint(row), EMAIL_VERIFICATION_TTL_MS);
    const result = await sendEmailVerification(email, row.name ?? parsed.data.name, `${siteConfig.url}/api/auth/verify-email?token=${token}`);

    if (!result.sent) {
      console.error("[auth] verification email failed", { customerId: row.id, error: result.error });
      return jsonError("We couldn't send your confirmation email. Please try again.", 502, "network");
    }
    return Response.json(GENERIC_OK);
  } catch (error) {
    console.error("[auth] register failed", error);
    return jsonError("We couldn't create your account. Please try again.", 500, "server_error");
  }
}
