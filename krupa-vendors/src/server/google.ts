import "server-only";
import { decodeIdToken, Google } from "arctic";
import { isProduction } from "./env";

/**
 * Sign in with Google for the partner portal — OAuth 2.0 authorization code
 * flow with PKCE, via arctic.
 *
 * The ID token comes straight from Google's token endpoint over TLS, so per
 * OpenID Connect Core §3.1.3.7 its signature needs no separate verification;
 * issuer, audience, expiry and email_verified are still checked. Codes and
 * tokens are never logged.
 *
 * Its cookies are named apart from the customer site's and the admin panel's so
 * that signing in to one never disturbs a flow in progress on another.
 */
export const GOOGLE_STATE_COOKIE = "krupa_partner_google_state";
export const GOOGLE_VERIFIER_COOKIE = "krupa_partner_google_verifier";
export const GOOGLE_NEXT_COOKIE = "krupa_partner_google_next";

export const GOOGLE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api/auth/google",
  maxAge: 10 * 60,
};

export const GOOGLE_SCOPES = ["openid", "email", "profile"];

const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001").replace(/\/$/, "");

export function isGoogleConfigured(): boolean {
  if (!process.env.GOOGLE_CLIENT_ID?.trim() || !process.env.GOOGLE_CLIENT_SECRET?.trim()) return false;
  // Deployed without NEXT_PUBLIC_SITE_URL, the callback below resolves to
  // localhost and Google sends the partner to a machine that isn't there, which
  // reads as a broken button rather than an unfinished deployment. The admin
  // panel shipped the same guard for the same reason.
  if (isProduction && !process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    console.error("[auth] NEXT_PUBLIC_SITE_URL is not set, so Google sign-in has no callback URL to offer. Set it to this deployment's own origin.");
    return false;
  }
  return true;
}

/** Must match an "Authorised redirect URI" on the OAuth client exactly. */
export function googleRedirectUri(): string {
  return `${siteUrl()}/api/auth/google/callback`;
}

export function googleClient(): Google {
  return new Google(process.env.GOOGLE_CLIENT_ID!.trim(), process.env.GOOGLE_CLIENT_SECRET!.trim(), googleRedirectUri());
}

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  name: string | null;
}

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Returns null when the token isn't a valid Google ID token for this client. */
export function readGoogleProfile(idToken: string, now = Date.now()): GoogleProfile | null {
  let claims: Record<string, unknown>;
  try {
    claims = decodeIdToken(idToken) as Record<string, unknown>;
  } catch {
    return null;
  }

  const audienceOk = claims.aud === process.env.GOOGLE_CLIENT_ID?.trim();
  const issuerOk = typeof claims.iss === "string" && GOOGLE_ISSUERS.includes(claims.iss);
  const fresh = typeof claims.exp === "number" && claims.exp * 1000 > now;
  if (!audienceOk || !issuerOk || !fresh) return null;
  if (typeof claims.email !== "string" || !claims.email) return null;

  return {
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 80) : null,
  };
}

/** Only same-site relative paths are allowed as a post-login destination. */
export function safeNextPath(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/orders";
}
