import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isProduction, requireEnv } from "./env";

/**
 * Signed, httpOnly session cookie for a partner login. Stateless and HMAC-signed
 * with this site's own SESSION_SECRET (never the customer site's). Every request
 * still re-checks in the database that the login is active — see `requireVendor`.
 */
export const SESSION_COOKIE = "krupa_partner_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export interface Session {
  userId: string;
  vendorId: string;
  exp: number;
}

function sign(payload: string): Buffer {
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(payload).digest();
}

export function signSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `p1.${payload}.${sign(payload).toString("base64url")}`;
}

export function verifySessionToken(token: string, now = Date.now()): Session | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "p1") return null;
  const [, payload, signature] = parts;
  const expected = sign(payload);
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<Session>;
    if (typeof session.userId !== "string" || typeof session.vendorId !== "string" || typeof session.exp !== "number") return null;
    if (session.exp * 1000 <= now) return null;
    return session as Session;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function writeSession(userId: string, vendorId: string): Promise<void> {
  const session: Session = { userId, vendorId, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  (await cookies()).set(SESSION_COOKIE, signSession(session), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
