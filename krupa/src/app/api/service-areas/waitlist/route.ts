import { logActivity } from "@/server/activity";
import { z } from "zod";
import { sendWaitlistEmail } from "@/server/email";
import { jsonError, readJson } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { isValidEmail, isValidIndianMobile, normalizePhone } from "@/lib/validation";

/**
 * POST /api/service-areas/waitlist — "notify me when you launch in my area".
 *
 * There's no waitlist table: each request is emailed to the operator
 * (ORDER_NOTIFICATION_EMAIL), who follows up by hand. Rate limited per IP.
 */
const HOUR = 60 * 60 * 1000;
const bodySchema = z.object({
  area: z.string().trim().min(1).max(80),
  contact: z.string().trim().min(5).max(160),
});

export async function POST(request: Request) {
  const limit = rateLimit(`waitlist:ip:${clientIp(request)}`, 5, HOUR);
  if (!limit.ok) return jsonError("You've already joined a few lists. Please try again later.", 429, "rate_limited");

  const parsed = bodySchema.safeParse(await readJson(request));
  const contact = parsed.success ? parsed.data.contact : "";
  const isEmail = isValidEmail(contact);
  if (!parsed.success || (!isEmail && !isValidIndianMobile(contact))) {
    return jsonError("Enter a valid email address or 10-digit mobile number.", 400, "validation");
  }

  const result = await sendWaitlistEmail(parsed.data.area, isEmail ? contact.toLowerCase() : normalizePhone(contact));
  if (!result.sent) {
    console.error("[waitlist] operator email failed", { error: result.error ?? result.skipped });
    return jsonError("We couldn't add you right now. Please try again, or call us.", 503, "unavailable");
  }
  logActivity({
    actorType: "system", action: "waitlist.joined", entityType: "area", entityId: parsed.data.area,
    summary: `Someone asked to be notified when we launch in ${parsed.data.area}`,
  });
  return Response.json({ ok: true });
}
