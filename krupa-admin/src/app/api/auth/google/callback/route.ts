import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logActivity } from "@/server/activity";
import { isAdminEmail } from "@/server/admins";
import { GOOGLE_COOKIE_OPTIONS, GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE, googleClient, isGoogleConfigured, readGoogleIdentity } from "@/server/google";
import { clientIp, rateLimit } from "@/server/rateLimit";
import { writeSession } from "@/server/session";

/**
 * GET /api/auth/google/callback — only accounts in ADMIN_EMAILS get a session.
 * Everyone else is sent back to /login with "not allowed", and the attempt is logged.
 */
export async function GET(request: Request) {
  if (!isGoogleConfigured()) redirect("/login?error=unavailable");
  if (!rateLimit(`admin-google-cb:${clientIp(request)}`, 20, 60 * 60 * 1000).ok) redirect("/login?error=rate_limited");

  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const storedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  const verifier = jar.get(GOOGLE_VERIFIER_COOKIE)?.value;
  for (const name of [GOOGLE_STATE_COOKIE, GOOGLE_VERIFIER_COOKIE]) jar.set(name, "", { ...GOOGLE_COOKIE_OPTIONS, maxAge: 0 });

  if (params.get("error")) redirect("/login?error=cancelled");
  const code = params.get("code");
  if (!code || !storedState || !verifier || params.get("state") !== storedState) redirect("/login?error=expired");

  let identity: { email: string; name: string | null } | null = null;
  try {
    const tokens = await googleClient().validateAuthorizationCode(code!, verifier!);
    identity = readGoogleIdentity(tokens.idToken());
  } catch (error) {
    console.error("[admin] google exchange failed", error instanceof Error ? error.message : "unknown");
  }
  if (!identity) redirect("/login?error=failed");

  if (!isAdminEmail(identity.email)) {
    console.warn("[admin] sign-in refused for a non-admin Google account");
    logActivity({
      actorType: "system", action: "admin.sign_in_refused",
      summary: "Someone tried to sign in to the admin panel with an account that isn't allowed",
      details: { domain: identity.email.split("@")[1] ?? null },
    });
    redirect("/login?error=not_allowed");
  }

  await writeSession(identity.email, identity.name);
  logActivity({
    actorType: "admin", actorId: identity.email, actorLabel: identity.name ?? "Admin",
    action: "admin.signed_in", summary: `${identity.name ?? "Admin"} signed in to the admin panel`,
  });
  redirect("/");
}
