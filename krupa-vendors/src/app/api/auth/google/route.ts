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
import { clientIp, rateLimit } from "@/server/rateLimit";

/** GET /api/auth/google — start partner sign-in with Google. */
export async function GET(request: Request) {
  if (!isGoogleConfigured()) redirect("/login?google=unavailable");
  if (!rateLimit(`partner-google:${clientIp(request)}`, 20, 60 * 60 * 1000).ok) redirect("/login?google=rate_limited");

  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, GOOGLE_SCOPES);
  // Partners often share a device with a personal account, so always ask which.
  url.searchParams.set("prompt", "select_account");

  const jar = await cookies();
  jar.set(GOOGLE_STATE_COOKIE, state, GOOGLE_COOKIE_OPTIONS);
  jar.set(GOOGLE_VERIFIER_COOKIE, verifier, GOOGLE_COOKIE_OPTIONS);
  jar.set(GOOGLE_NEXT_COOKIE, next, GOOGLE_COOKIE_OPTIONS);
  redirect(url.toString());
}
