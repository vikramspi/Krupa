import { logActivity } from "@/server/activity";
import { redirect } from "next/navigation";
import { emailVerificationFingerprint, findCustomerAuthRow, markEmailVerified } from "@/server/repositories/customers";
import { verifyActionToken } from "@/server/tokens";

/**
 * GET /api/auth/verify-email?token=… — the emailed confirmation link.
 *
 * The token is signed over the account's current verification state, so clicking
 * it a second time fails. Always redirects; the token is never logged.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) redirect("/login?verify=invalid");

  const result = await verifyActionToken(token, "verify_email", async (customerId) => {
    const row = await findCustomerAuthRow(customerId);
    return row ? emailVerificationFingerprint(row) : null;
  }).catch((error: unknown) => {
    console.error("[auth] email verification failed", error);
    return { ok: false as const, reason: "invalid" as const };
  });

  if (!result.ok) redirect(`/login?verify=${result.reason === "expired" ? "expired" : "invalid"}`);

  await markEmailVerified(result.customerId);
  logActivity({
    actorType: "customer", actorId: result.customerId, action: "customer.email_verified",
    entityType: "customer", entityId: result.customerId, summary: "A customer confirmed their email address",
  });
  redirect("/login?verify=success");
}
