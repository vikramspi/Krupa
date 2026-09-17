import { z } from "zod";
import { sendPartnerPasswordReset } from "@/server/email";
import { guardDatabase, jsonError, readJson } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { findUserByEmail, setResetToken } from "@/server/repositories/vendorUsers";
import { newLinkToken, RESET_TTL_MS } from "@/server/tokens";

/** POST /api/auth/password/forgot — same answer whether or not the email has a login. */
const HOUR = 60 * 60 * 1000;
const OK = { ok: true, message: "If that email has a partner login, a reset link is on its way." };
const schema = z.object({ email: z.email().max(160) });

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001").replace(/\/$/, "");

export async function POST(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  if (!rateLimit(`p-forgot:ip:${clientIp(request)}`, 10, HOUR).ok) {
    return jsonError("Too many requests. Please try again later.", 429, "rate_limited");
  }
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Enter a valid email address.", 400, "validation");
  const email = parsed.data.email.toLowerCase();
  if (!rateLimit(`p-forgot:email:${email}`, 3, HOUR).ok) return Response.json(OK);

  try {
    const row = await findUserByEmail(email);
    if (row?.is_active) {
      const { token, hash } = newLinkToken();
      await setResetToken(row.id, hash, new Date(Date.now() + RESET_TTL_MS));
      const result = await sendPartnerPasswordReset(email, row.name, `${siteUrl()}/set-password?kind=reset&token=${token}`);
      if (!result.sent) console.error("[auth] partner reset email failed", { userId: row.id, error: result.error ?? result.skipped });
    }
  } catch (error) {
    console.error("[auth] partner forgot-password failed", error instanceof Error ? error.message : error);
  }
  return Response.json(OK);
}
