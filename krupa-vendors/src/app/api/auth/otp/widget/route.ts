import { z } from "zod";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { verifyWidgetAccessToken } from "@/server/msg91Widget";
import { completePhoneLogin } from "@/server/phoneLogin";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";
import { ServiceError } from "@/types";

/**
 * POST /api/auth/otp/widget — finish an MSG91 widget verification. The token is
 * confirmed with MSG91 first, and the number MSG91 returns is the one trusted.
 */
const schema = z.object({ phone: z.string().trim().min(10).max(16), accessToken: z.string().trim().min(20).max(4096) });

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  if (!rateLimit(`p-otp-widget:ip:${clientIp(request)}`, 40, 60 * 60 * 1000).ok) {
    return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || !isValidIndianMobile(parsed.data.phone)) {
    return jsonError("Please verify your mobile number again.", 400, "validation");
  }
  try {
    const check = await verifyWidgetAccessToken(parsed.data.accessToken);
    if (!check.ok) return jsonError("We couldn't confirm that code. Please request a new one.", 401, "unauthorised");
    if (check.phone !== normalizePhone(parsed.data.phone)) {
      return jsonError("That code was sent to a different number. Please verify again.", 401, "unauthorised");
    }
    const user = await completePhoneLogin(check.phone);
    if (!user) return jsonError("This number isn't registered for the partner portal.", 403, "unauthorised");
    return Response.json({ user });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[auth] partner widget login failed", error instanceof Error ? error.message : error);
    return jsonError("We couldn't verify your number. Please try again.", 500, "server_error");
  }
}
