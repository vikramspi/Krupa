import { otpVerifySchema } from "@/server/authSchema";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { verifyOtpChallenge } from "@/server/otp";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { completePhoneSignIn } from "@/server/phoneSignIn";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";
import { ServiceError } from "@/types";

/**
 * POST /api/auth/otp/verify — check the code and open a session.
 *
 * On success the customer row is created (first sign-in) or found, and a signed
 * httpOnly cookie is set. `needsName` tells the UI to collect a name next.
 */
const HOUR = 60 * 60 * 1000;
const MAX_ATTEMPTS_PER_PHONE_PER_HOUR = 10;

const FAILURE_MESSAGES = {
  not_found: "That code has expired. Please request a new one.",
  expired: "That code has expired. Please request a new one.",
  too_many_attempts: "Too many incorrect attempts. Please request a new code.",
  invalid: "That code doesn't match. Please check and try again.",
} as const;

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const ipLimit = rateLimit(`otp-verify:ip:${ip}`, 40, HOUR);
  if (!ipLimit.ok) return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");

  const parsed = otpVerifySchema.safeParse(await readJson(request));
  if (!parsed.success || !isValidIndianMobile(parsed.data.phone)) {
    return jsonError("Enter the 6-digit code sent to your mobile.", 400, "validation");
  }
  const phone = normalizePhone(parsed.data.phone);

  const attemptLimit = rateLimit(`otp-verify:phone:${phone}`, MAX_ATTEMPTS_PER_PHONE_PER_HOUR, HOUR);
  if (!attemptLimit.ok) {
    return jsonError("Too many attempts for this number. Please try again later.", 429, "rate_limited", {
      retryAfter: attemptLimit.retryAfter,
    });
  }

  try {
    const result = await verifyOtpChallenge(phone, parsed.data.code);
    if (!result.ok) {
      return jsonError(FAILURE_MESSAGES[result.reason], 401, "validation");
    }

    return Response.json(await completePhoneSignIn(phone, parsed.data.name));
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.code === "validation" ? 409 : 503, error.code);
    }
    console.error("[otp] verify failed", error);
    return jsonError("We couldn't verify that code. Please try again.", 500, "server_error");
  }
}
