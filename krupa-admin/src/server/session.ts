import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isProduction, requireEnv } from "./env";

/**
 * Admin session: signed with this site's own SESSION_SECRET, short-lived (12 h)
 * and SameSite=Strict, since every admin action is powerful.
 */
export const SESSION_COOKIE = "krupa_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12;

export interface AdminSession {
  email: string;
  name: string | null;
  exp: number;
}

const sign = (payload: string) => createHmac("sha256", requireEnv("SESSION_SECRET")).update(payload).digest();

export function signSession(session: AdminSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `a1.${payload}.${sign(payload).toString("base64url")}`;
}

export function verifySessionToken(token: string, now = Date.now()): AdminSession | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "a1") return null;
  const [, payload, signature] = parts;
  const expected = sign(payload);
  const provided = Buffer.from(signature, "base64url");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString()) as Partial<AdminSession>;
    if (typeof session.email !== "string" || typeof session.exp !== "number") return null;
    if (session.exp * 1000 <= now) return null;
    return { email: session.email, name: typeof session.name === "string" ? session.name : null, exp: session.exp };
  } catch {
    return null;
  }
}

export async function readSession(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySessionToken(token) : null;
}

export async function writeSession(email: string, name: string | null): Promise<void> {
  const session: AdminSession = { email, name, exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS };
  (await cookies()).set(SESSION_COOKIE, signSession(session), {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
