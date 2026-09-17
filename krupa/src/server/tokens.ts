import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./env";

/**
 * Signed, time-limited action links (email verification, password reset).
 *
 * Stateless — no token table. Single use comes from the `fingerprint`: the
 * signature covers a value that changes the moment the action completes, so a
 * used link stops verifying.
 *
 *   verify_email   → fingerprint includes email_verified_at (null → a timestamp)
 *   reset_password → fingerprint includes password_hash (changes on reset)
 *
 * Raw tokens are never logged.
 */
export type TokenPurpose = "verify_email" | "reset_password";

export const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function sign(purpose: TokenPurpose, customerId: string, expiry: number, fingerprint: string): string {
  return createHmac("sha256", requireEnv("SESSION_SECRET"))
    .update(`${purpose}.${customerId}.${expiry}.${fingerprint}`)
    .digest("base64url");
}

export function createActionToken(
  purpose: TokenPurpose,
  customerId: string,
  fingerprint: string,
  ttlMs: number,
  now = Date.now(),
): string {
  const expiry = now + ttlMs;
  const payload = Buffer.from(JSON.stringify({ p: purpose, c: customerId, e: expiry })).toString("base64url");
  return `${payload}.${sign(purpose, customerId, expiry, fingerprint)}`;
}

export type TokenCheck =
  | { ok: true; customerId: string }
  | { ok: false; reason: "malformed" | "expired" | "invalid" };

/**
 * `lookupFingerprint` receives the claimed customer id and returns the current
 * fingerprint, or null when the account is gone.
 */
export async function verifyActionToken(
  token: string,
  purpose: TokenPurpose,
  lookupFingerprint: (customerId: string) => Promise<string | null>,
  now = Date.now(),
): Promise<TokenCheck> {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  let claim: { p?: string; c?: string; e?: number };
  try {
    claim = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (claim.p !== purpose || typeof claim.c !== "string" || typeof claim.e !== "number") {
    return { ok: false, reason: "malformed" };
  }
  if (claim.e <= now) return { ok: false, reason: "expired" };

  const fingerprint = await lookupFingerprint(claim.c);
  if (fingerprint === null) return { ok: false, reason: "invalid" };

  const expected = Buffer.from(sign(purpose, claim.c, claim.e, fingerprint));
  const provided = Buffer.from(parts[1]);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "invalid" };
  }
  return { ok: true, customerId: claim.c };
}
