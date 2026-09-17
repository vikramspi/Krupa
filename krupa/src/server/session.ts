import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isProduction, requireEnv } from "./env";

/**
 * Signed, httpOnly session cookie identifying a phone number that has passed OTP
 * verification. Stateless: the payload is HMAC-SHA256 signed with SESSION_SECRET,
 * so a tampered or forged cookie fails verification.
 */
export const SESSION_COOKIE = "krupa_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface Session {
  /** Null when signed in by email+password without a verified phone yet. */
  phone: string | null;
  customerId: string;
  /** Unix seconds. */
  exp: number;
}

function sign(payload: string): Buffer {
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(payload).digest();
}

export function signSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `v1.${payload}.${sign(payload).toString("base64url")}`;
}

/** Returns the session only if the signature is valid and it hasn't expired. */
export function verifySessionToken(token: string, now = Date.now()): Session | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const [, payload, signature] = parts;

  const expected = sign(payload);
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<Session>;
    const phoneOk = session.phone === null || typeof session.phone === "string";
    if (!phoneOk || typeof session.customerId !== "string" || typeof session.exp !== "number") {
      return null;
    }
    if (session.exp * 1000 <= now) return null;
    return session as Session;
  } catch {
    return null;
  }
}

export function newSession(phone: string | null, customerId: string, now = Date.now()): Session {
  return { phone, customerId, exp: Math.floor(now / 1000) + MAX_AGE_SECONDS };
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function writeSessionCookie(session: Session): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, signSession(session), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
