import { z } from "zod";
import { isProduction } from "@/server/env";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { verifyOtpChallenge } from "@/server/otp";
import { completePhoneLogin } from "@/server/phoneLogin";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";

/** POST /api/auth/otp/verify — LOCAL DEVELOPMENT ONLY, pairs with /api/auth/otp. */
const schema = z.object({ phone: z.string().trim().min(10).max(16), code: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  if (isProduction) return jsonError("Not available.", 404, "not_found");
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  if (!rateLimit(`p-otp-verify:ip:${clientIp(request)}`, 40, 60 * 60 * 1000).ok) {
    return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || !isValidIndianMobile(parsed.data.phone)) return jsonError("Enter the 6-digit code.", 400, "validation");
  const phone = normalizePhone(parsed.data.phone);
  const result = await verifyOtpChallenge(phone, parsed.data.code);
  if (!result.ok) return jsonError("That code is wrong or has expired.", 401, "validation");
  const user = await completePhoneLogin(phone);
  if (!user) return jsonError("This number isn't registered for the partner portal.", 403, "unauthorised");
  return Response.json({ user });
}
