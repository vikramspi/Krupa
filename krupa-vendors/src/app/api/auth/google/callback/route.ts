import { OAuth2RequestError } from "arctic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDatabaseConfigured } from "@/server/env";
import {
  GOOGLE_COOKIE_OPTIONS,
  GOOGLE_NEXT_COOKIE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  googleClient,
  isGoogleConfigured,
  readGoogleProfile,
  safeNextPath,
} from "@/server/google";
import { signInWithVerifiedEmail, type PartnerLookup } from "@/server/partnerAccount";
import { clientIp, rateLimit } from "@/server/rateLimit";

/**
 * GET /api/auth/google/callback — Google sends the browser back here.
 *
 * Checks state, exchanges the code (with the PKCE verifier) for an ID token,
 * and resolves the verified address to a partner. An address Google has not
 * verified is refused outright: it is the only thing proving the person owns
 * the mailbox we matched against the shop.
 */
type Failure = "cancelled" | "expired" | "error" | "unverified" | "unknown" | "inactive" | "unavailable" | "rate_limited";

export async function GET(request: Request) {
  if (!isGoogleConfigured() || !isDatabaseConfigured()) redirect("/login?google=unavailable");
  if (!rateLimit(`partner-google-cb:${clientIp(request)}`, 30, 60 * 60 * 1000).ok) redirect("/login?google=rate_limited");

  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const storedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  const codeVerifier = jar.get(GOOGLE_VERIFIER_COOKIE)?.value;
  const next = safeNextPath(jar.get(GOOGLE_NEXT_COOKIE)?.value);
  // One attempt per start: the flow cookies are spent whatever happens next.
  for (const name of [GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, GOOGLE_NEXT_COOKIE]) {
    jar.set(name, "", { ...GOOGLE_COOKIE_OPTIONS, maxAge: 0 });
  }

  const fail = (reason: Failure): never => redirect(`/login?google=${reason}`);

  if (params.get("error")) fail(params.get("error") === "access_denied" ? "cancelled" : "error");

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) fail("expired");

  // redirect() throws, so it must stay outside this try.
  let result: PartnerLookup | null = null;
  let unverified = false;
  try {
    const tokens = await googleClient().validateAuthorizationCode(code!, codeVerifier!);
    const profile = readGoogleProfile(tokens.idToken());
    if (!profile) console.error("[auth] google returned an unusable ID token");
    else if (!profile.emailVerified) unverified = true;
    else result = await signInWithVerifiedEmail(profile.email, profile.name, "Google");
  } catch (error) {
    if (error instanceof OAuth2RequestError) console.error("[auth] google code exchange rejected", { code: error.code });
    else console.error("[auth] partner google sign-in failed", error instanceof Error ? error.message : error);
  }

  if (unverified) fail("unverified");
  if (!result) fail("error");
  if (!result!.ok) fail(result!.reason);

  redirect(next);
}
