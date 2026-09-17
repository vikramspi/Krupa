import { z } from "zod";
import { isProduction } from "@/server/env";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { createOtpChallenge } from "@/server/otp";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findUserByPhone } from "@/server/repositories/vendorUsers";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";

/**
 * POST /api/auth/otp — LOCAL DEVELOPMENT ONLY fallback when the MSG91 widget
 * can't run (e.g. its captcha refuses localhost). Returns the code to the browser,
 * so it is disabled outright in production.
 */
const schema = z.object({ phone: z.string().trim().min(10).max(16) });

export async function POST(request: Request) {
  if (isProduction) return jsonError("Not available.", 404, "not_found");
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  if (!rateLimit(`p-otp:ip:${clientIp(request)}`, 20, 60 * 60 * 1000).ok) {
    return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || !isValidIndianMobile(parsed.data.phone)) {
    return jsonError("Enter a valid 10-digit mobile number.", 400, "validation");
  }
  const phone = normalizePhone(parsed.data.phone);
  const row = await findUserByPhone(phone);
  if (!row || !row.is_active) {
    return jsonError("This number isn't registered for the partner portal. Please contact Krupa Laundry.", 404, "not_found");
  }
  const { code } = await createOtpChallenge(phone);
  return Response.json({ devCode: code, expiresInMinutes: 5 });
}
