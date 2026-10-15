import "server-only";
import { decodeIdToken, Google } from "arctic";
import { isProduction } from "./env";

/** Google sign-in for the admin panel (authorization code + PKCE via arctic). */
export const GOOGLE_STATE_COOKIE = "krupa_admin_google_state";
export const GOOGLE_VERIFIER_COOKIE = "krupa_admin_google_verifier";

export const GOOGLE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api/auth/google",
  maxAge: 10 * 60,
};

export function isGoogleConfigured(): boolean {
  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) return false;
  // The callback URL is built from NEXT_PUBLIC_SITE_URL. Deployed without it,
  // sign-in used to hand Google a redirect_uri of http://localhost:3002 and
  // send whoever clicked it to a machine that isn't there — so the panel looked
  // broken rather than unconfigured. Treat the missing URL as what it is.
  if (isProduction && !process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    console.error("[auth] NEXT_PUBLIC_SITE_URL is not set, so Google sign-in has no callback URL to offer. Set it to this deployment's own origin.");
    return false;
  }
  return true;
}

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3002").replace(/\/$/, "");

export function googleClient(): Google {
  return new Google(process.env.GOOGLE_CLIENT_ID!.trim(), process.env.GOOGLE_CLIENT_SECRET!.trim(), `${siteUrl()}/api/auth/google/callback`);
}

/** Verified email + name from Google's ID token (read over TLS from Google's token endpoint). */
export function readGoogleIdentity(idToken: string, now = Date.now()): { email: string; name: string | null } | null {
  let claims: Record<string, unknown>;
  try {
    claims = decodeIdToken(idToken) as Record<string, unknown>;
  } catch {
    return null;
  }
  const issuerOk = claims.iss === "https://accounts.google.com" || claims.iss === "accounts.google.com";
  const audienceOk = claims.aud === process.env.GOOGLE_CLIENT_ID?.trim();
  const fresh = typeof claims.exp === "number" && claims.exp * 1000 > now;
  const verified = claims.email_verified === true || claims.email_verified === "true";
  if (!issuerOk || !audienceOk || !fresh || !verified || typeof claims.email !== "string") return null;
  return { email: claims.email.toLowerCase(), name: typeof claims.name === "string" ? claims.name : null };
}
