import { otpRequestSchema } from "@/server/authSchema";
import { isProduction } from "@/server/env";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { isSmsConfigured, sendOtpSms } from "@/server/msg91";
import { createOtpChallenge, OTP_TTL_MINUTES } from "@/server/otp";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { supabase } from "@/server/supabase";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";
import { ServiceError } from "@/types";

/**
 * POST /api/auth/otp — start phone verification.
 *
 * Rate limited per phone and per IP. The generated code is hashed before storage
 * and is never logged (except in development when SMS isn't configured).
 *
 * Local development without MSG91 also returns the code as `devCode` so the flow is
 * usable in the browser. Production never does: `sendOtpSms` refuses first there.
 */
const HOUR = 60 * 60 * 1000;
const MAX_PER_PHONE_PER_HOUR = 5;
const MAX_PER_IP_PER_HOUR = 20;

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const ip = clientIp(request);
  const ipLimit = rateLimit(`otp:ip:${ip}`, MAX_PER_IP_PER_HOUR, HOUR);
  if (!ipLimit.ok) {
    return jsonError("Too many verification requests. Please try again later.", 429, "rate_limited", { retryAfter: ipLimit.retryAfter });
  }

  const parsed = otpRequestSchema.safeParse(await readJson(request));
  if (!parsed.success || !isValidIndianMobile(parsed.data.phone)) {
    return jsonError("Enter a valid 10-digit mobile number.", 400, "validation");
  }
  const phone = normalizePhone(parsed.data.phone);

  const phoneLimit = rateLimit(`otp:phone:${phone}`, MAX_PER_PHONE_PER_HOUR, HOUR);
  if (!phoneLimit.ok) {
    return jsonError("You've requested several codes. Please wait a while before trying again.", 429, "rate_limited", {
      retryAfter: phoneLimit.retryAfter,
    });
  }

  try {
    const existing = await supabase().from("customers").select("name").eq("phone", phone).maybeSingle();
    const { code } = await createOtpChallenge(phone);
    await sendOtpSms(phone, code);

    return Response.json({
      codeRequired: true,
      channel: "sms",
      expiresInMinutes: OTP_TTL_MINUTES,
      isExistingCustomer: Boolean(existing.data),
      hasName: Boolean(existing.data?.name),
      /** True when no SMS provider is wired up — the code is on the server console. */
      devDelivery: !isSmsConfigured(),
      ...(!isProduction && !isSmsConfigured() ? { devCode: code } : {}),
    });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[otp] request failed", error);
    return jsonError("We couldn't start verification. Please try again.", 500, "server_error");
  }
}
