import { z } from "zod";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findUserByPhone } from "@/server/repositories/vendorUsers";
import { isValidIndianMobile, normalizePhone } from "@/lib/validation";

/**
 * POST /api/auth/phone — is this number registered as an active partner login?
 * Checked before any SMS is sent, so we don't text numbers that can't log in.
 * Rate limited; partner numbers are business contacts, not secrets.
 */
const schema = z.object({ phone: z.string().trim().min(10).max(16) });

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  if (!rateLimit(`p-phone:ip:${clientIp(request)}`, 20, 60 * 60 * 1000).ok) {
    return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || !isValidIndianMobile(parsed.data.phone)) {
    return jsonError("Enter a valid 10-digit mobile number.", 400, "validation");
  }
  const row = await findUserByPhone(normalizePhone(parsed.data.phone));
  if (!row || !row.is_active) {
    return jsonError("This number isn't registered for the partner portal. Please contact Krupa Laundry.", 404, "not_found");
  }
  return Response.json({ ok: true });
}
