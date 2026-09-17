import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  GOOGLE_COOKIE_OPTIONS,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_SCOPES,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  googleClient,
  isGoogleConfigured,
  safeNextPath,
} from "@/server/google";
import { isDatabaseConfigured } from "@/server/env";
import { clientIp, rateLimit } from "@/server/rateLimit";

/**
 * GET /api/auth/google?next=/book/details — starts "Sign in with Google".
 *
 * Stores a random state (CSRF) and PKCE verifier in short-lived httpOnly cookies,
 * then sends the browser to Google's consent screen.
 */
export async function GET(request: Request) {
  if (!isGoogleConfigured() || !isDatabaseConfigured()) redirect("/login?google=unavailable");

  const limit = rateLimit(`google:start:${clientIp(request)}`, 30, 60 * 60 * 1000);
  if (!limit.ok) redirect("/login?google=rate_limited");

  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, codeVerifier, GOOGLE_SCOPES);
  url.searchParams.set("prompt", "select_account");

  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, state, GOOGLE_COOKIE_OPTIONS);
  jar.set(GOOGLE_VERIFIER_COOKIE, codeVerifier, GOOGLE_COOKIE_OPTIONS);
  jar.set(GOOGLE_NEXT_COOKIE, safeNextPath(new URL(request.url).searchParams.get("next")), GOOGLE_COOKIE_OPTIONS);

  redirect(url.toString());
}
