import { guardDatabase, jsonError } from "@/server/http";
import { resolveLink } from "@/server/linkTokens";
import { clientIp, rateLimit } from "@/server/rateLimit";

/** GET /api/auth/password/link?kind=invite|reset&token= — is this link still usable? */
export async function GET(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  if (!rateLimit(`p-link:ip:${clientIp(request)}`, 30, 60 * 60 * 1000).ok) {
    return jsonError("Too many attempts. Please try again later.", 429, "rate_limited");
  }
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") === "reset" ? "reset" : "invite";
  const row = await resolveLink(kind, params.get("token") ?? "");
  if (!row) return jsonError("This link has expired or was already used.", 410, "expired");
  return Response.json({ name: row.name, email: row.email });
}
