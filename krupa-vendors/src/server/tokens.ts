import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Single-use link tokens (invites, password resets). Only the SHA-256 hash is
 * stored; the raw token lives only in the email. Never log either.
 */
export function newLinkToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashLinkToken(token) };
}

export function hashLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const RESET_TTL_MS = 60 * 60 * 1000;
