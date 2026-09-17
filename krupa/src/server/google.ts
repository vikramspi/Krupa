import "server-only";
import { decodeIdToken, Google } from "arctic";
import { siteConfig } from "@/lib/config";
import { isProduction } from "./env";

/**
 * Sign in with Google — OAuth 2.0 authorization code flow with PKCE, via arctic.
 *
 * The ID token is read straight from Google's token endpoint over TLS, so per
 * OpenID Connect Core §3.1.3.7 its signature doesn't need separate verification;
 * issuer, audience and expiry are still checked. Codes and tokens are never logged.
 */
export const GOOGLE_STATE_COOKIE = "krupa_google_state";
export const GOOGLE_VERIFIER_COOKIE = "krupa_google_verifier";
export const GOOGLE_NEXT_COOKIE = "krupa_google_next";

/** The flow's short-lived cookies are only ever sent to the Google auth routes. */
export const GOOGLE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/api/auth/google",
  maxAge: 10 * 60,
};

export const GOOGLE_SCOPES = ["openid", "email", "profile"];

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
}

/** Must match an "Authorised redirect URI" on the OAuth client exactly. */
export function googleRedirectUri(): string {
  return `${siteConfig.url.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function googleClient(): Google {
  return new Google(process.env.GOOGLE_CLIENT_ID!.trim(), process.env.GOOGLE_CLIENT_SECRET!.trim(), googleRedirectUri());
}

export interface GoogleProfile {
  /** Stable Google account id. */
  sub: string;
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
  if (typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string" || !claims.email) return null;

  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 80) : null,
  };
}

/** Only same-site relative paths are allowed as a post-login destination. */
export function safeNextPath(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/account";
}
