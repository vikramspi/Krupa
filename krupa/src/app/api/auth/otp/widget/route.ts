import { z } from "zod";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { verifyWidgetAccessToken } from "@/server/msg91Widget";
import { completePhoneSignIn } from "@/server/phoneSignIn";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";
import { ServiceError } from "@/types";

/**
 * POST /api/auth/otp/widget — finish phone verification done in the MSG91 widget.
 *
 * The browser's access token is checked with MSG91 before anything is trusted;
 * the number MSG91 returns must match the number the customer typed, and it is
 * that MSG91-confirmed number which goes on the session.
 */
const HOUR = 60 * 60 * 1000;

const bodySchema = z.object({
  phone: z.string().trim().min(10).max(16),
  accessToken: z.string().trim().min(20).max(4096),
  name: z.string().trim().min(2).max(80).optional(),
});

const REJECTED = {
  invalid: "We couldn't confirm that code. Please request a new one.",
  reused: "That verification has already been used. Please request a new code.",
  not_indian_mobile: "Please verify an Indian mobile number.",
} as const;

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ipLimit = rateLimit(`otp-widget:ip:${clientIp(request)}`, 40, HOUR);
  if (!ipLimit.ok) return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success || !isValidIndianMobile(parsed.data.phone)) {
    return jsonError("Please verify your mobile number again.", 400, "validation");
  }
  const claimedPhone = normalizePhone(parsed.data.phone);

  try {
    const check = await verifyWidgetAccessToken(parsed.data.accessToken);
    if (!check.ok) return jsonError(REJECTED[check.reason], 401, "unauthorised");

    if (check.phone !== claimedPhone) {
      console.warn("[otp] widget token was issued for a different number than claimed");
      return jsonError("That code was sent to a different number. Please verify again.", 401, "unauthorised");
    }

    return Response.json(await completePhoneSignIn(check.phone, parsed.data.name));
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.code === "validation" ? 409 : 503, error.code);
    }
    console.error("[otp] widget verify failed", error instanceof Error ? error.message : "unknown error");
    return jsonError("We couldn't verify your number. Please try again.", 500, "server_error");
  }
}
