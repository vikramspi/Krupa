import { logActivity } from "@/server/activity";
import { resetPasswordSchema } from "@/server/authSchema";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { hashPassword } from "@/server/password";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findCustomerAuthRow, markEmailVerified, passwordResetFingerprint, setPasswordHash } from "@/server/repositories/customers";
import { verifyActionToken } from "@/server/tokens";

/**
 * POST /api/auth/password/reset — complete a reset.
 *
 * The link is signed over the current password hash, so storing the new hash
 * invalidates that link and every other outstanding one. Neither the token nor
 * the password is ever logged.
 */
export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const limit = rateLimit(`reset:ip:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");

  const parsed = resetPasswordSchema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Choose a password of at least 8 characters.", 400, "validation");

  try {
    const result = await verifyActionToken(parsed.data.token, "reset_password", async (customerId) => {
      const row = await findCustomerAuthRow(customerId);
      return row ? passwordResetFingerprint(row) : null;
    });

    if (!result.ok) {
      return jsonError(
        result.reason === "expired"
          ? "That reset link has expired. Please request a new one."
          : "That reset link is no longer valid. Please request a new one.",
        400,
        "validation",
      );
    }

    // Only someone with the inbox can open this link, so it also confirms the email.
    const row = await findCustomerAuthRow(result.customerId);
    await setPasswordHash(result.customerId, await hashPassword(parsed.data.password));
    if (row && !row.email_verified_at) await markEmailVerified(result.customerId);
    console.info("[auth] password reset completed", { customerId: result.customerId });
    logActivity({
      actorType: "customer", actorId: result.customerId, action: "customer.password_reset",
      entityType: "customer", entityId: result.customerId, summary: "A customer reset their password",
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[auth] password reset failed", error);
    return jsonError("We couldn't reset your password. Please try again.", 500, "server_error");
  }
}
