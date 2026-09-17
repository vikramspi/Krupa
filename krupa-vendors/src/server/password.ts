import "server-only";
import bcrypt from "bcryptjs";

/**
 * Password hashing.
 *
 * bcrypt with cost 12 — deliberately slow and salted. Never reuse the OTP HMAC
 * here: that is a fast keyed hash designed for 5-minute, 6-digit codes, and would
 * be trivially brute-forceable against long-lived credentials.
 */
const COST = 12;

export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  // Compare against a dummy hash when the account has no password, so the response
  // time doesn't reveal whether the account exists or uses phone-only sign-in.
  const target = hash ?? "$2b$12$c0oJk7Q1i0V1k2J3l4M5n.OaPbQcRdSeTfUgVhWiXjYkZlAmBnCdE";
  const matches = await bcrypt.compare(password, target);
  return hash === null ? false : matches;
}
