import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GOOGLE_COOKIE_OPTIONS, GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, googleClient, isGoogleConfigured } from "@/server/google";
import { clientIp, rateLimit } from "@/server/rateLimit";

/** GET /api/auth/google — start admin sign-in. */
export async function GET(request: Request) {
  if (!isGoogleConfigured()) redirect("/login?error=unavailable");
  if (!rateLimit(`admin-google:${clientIp(request)}`, 20, 60 * 60 * 1000).ok) redirect("/login?error=rate_limited");

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
  url.searchParams.set("prompt", "select_account");

  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, state, GOOGLE_COOKIE_OPTIONS);
  jar.set(GOOGLE_VERIFIER_COOKIE, verifier, GOOGLE_COOKIE_OPTIONS);
  redirect(url.toString());
}
