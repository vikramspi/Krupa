import { logActivity } from "@/server/activity";
import { OAuth2RequestError } from "arctic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
import { signInWithGoogle, type GoogleSignInResult } from "@/server/googleAccount";
import { isDatabaseConfigured } from "@/server/env";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { newSession, writeSessionCookie } from "@/server/session";

/**
 * GET /api/auth/google/callback — Google sends the browser back here.
 *
 * Checks state, exchanges the code (with the PKCE verifier) for an ID token,
 * resolves the account, and issues the same session cookie as every other sign-in.
 * Accounts without a verified phone land on /login, which asks for one before
 * checkout. Failures redirect to /login?google=<reason>; codes and tokens are
 * never logged.
 */
type Failure = "cancelled" | "expired" | "error" | "unverified" | "conflict" | "unavailable" | "rate_limited";

export async function GET(request: Request) {
  if (!isGoogleConfigured() || !isDatabaseConfigured()) redirect("/login?google=unavailable");

  const limit = rateLimit(`google:callback:${clientIp(request)}`, 30, 60 * 60 * 1000);
  if (!limit.ok) redirect("/login?google=rate_limited");

  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const storedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  const codeVerifier = jar.get(GOOGLE_VERIFIER_COOKIE)?.value;
  const next = safeNextPath(jar.get(GOOGLE_NEXT_COOKIE)?.value);
  // One attempt per start: the flow cookies are spent whatever happens next.
  for (const name of [GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, GOOGLE_NEXT_COOKIE]) {
    jar.set(name, "", { ...GOOGLE_COOKIE_OPTIONS, maxAge: 0 });
  }

  const fail = (reason: Failure): never => redirect(`/login?google=${reason}&next=${encodeURIComponent(next)}`);

  if (params.get("error")) fail(params.get("error") === "access_denied" ? "cancelled" : "error");

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) fail("expired");

  // redirect() throws, so it must stay outside this try.
  let result: GoogleSignInResult | null = null;
  try {
    const tokens = await googleClient().validateAuthorizationCode(code!, codeVerifier!);
    const profile = readGoogleProfile(tokens.idToken());
    if (profile) result = await signInWithGoogle(profile);
    else console.error("[auth] google returned an unusable ID token");
  } catch (error) {
    if (error instanceof OAuth2RequestError) {
      console.error("[auth] google code exchange rejected", { code: error.code });
    } else {
      console.error("[auth] google sign-in failed", error instanceof Error ? error.message : error);
    }
  }
  if (!result) return fail("error");

  if (!result.ok) {
    console.warn("[auth] google sign-in refused", { reason: result.reason });
    return fail(result.reason === "email_unverified" ? "unverified" : "conflict");
  }

  await writeSessionCookie(newSession(result.phone, result.customerId));
  logActivity({
    actorType: "customer", actorId: result.customerId,
    action: result.outcome === "created" ? "customer.signed_up" : "customer.signed_in",
    entityType: "customer", entityId: result.customerId,
    summary:
      result.outcome === "created"
        ? "New customer signed up with Google"
        : result.outcome === "linked"
          ? "A customer linked Google to their account"
          : "A customer signed in with Google",
  });
  console.info("[auth] google sign-in", { customerId: result.customerId, outcome: result.outcome, hasPhone: Boolean(result.phone) });

  // No verified phone yet: /login shows the "verify your mobile number" step, then continues to `next`.
  redirect(result.phone ? next : `/login?next=${encodeURIComponent(next)}`);
}
