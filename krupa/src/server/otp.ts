import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { ServiceError } from "@/types";
import { requireEnv } from "./env";
import { supabase } from "./supabase";

export const OTP_TTL_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;

/** Six digits, uniformly distributed, from a CSPRNG. */
export function generateOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Codes are stored as an HMAC keyed with SESSION_SECRET and bound to the phone
 * number, so a leaked database row can't be replayed against another number and
 * can't be reversed by rainbow table.
 */
export function hashOtpCode(phone: string, code: string): string {
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(`${phone}:${code}`).digest("hex");
}

function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Replaces any outstanding code for this phone with a fresh one. Returns the raw code to send. */
export async function createOtpChallenge(phone: string, now = new Date()): Promise<{ code: string; expiresAt: Date }> {
  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);

  const db = supabase();
  await db.from("otp_codes").delete().eq("phone", phone).eq("audience", "customer");
  const { error } = await db.from("otp_codes").insert({
    phone,
    audience: "customer",
    code_hash: hashOtpCode(phone, code),
    expires_at: expiresAt.toISOString(),
  });
  if (error) {
    console.error("[otp] failed to store challenge", { message: error.message });
    throw new ServiceError("We couldn't start verification. Please try again.", "network");
  }
  return { code, expiresAt };
}

export type OtpVerifyResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "invalid" };

export async function verifyOtpChallenge(phone: string, code: string, now = new Date()): Promise<OtpVerifyResult> {
  const db = supabase();
  const { data, error } = await db
    .from("otp_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("phone", phone)
    .eq("audience", "customer")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[otp] lookup failed", { message: error.message });
    throw new ServiceError("We couldn't verify that code. Please try again.", "network");
  }
  if (!data) return { ok: false, reason: "not_found" };

  if (new Date(data.expires_at).getTime() <= now.getTime()) {
    await db.from("otp_codes").delete().eq("id", data.id);
    return { ok: false, reason: "expired" };
  }
  if (data.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, reason: "too_many_attempts" };
  }
  if (!hashesMatch(data.code_hash, hashOtpCode(phone, code))) {
    await db
      .from("otp_codes")
      .update({ attempts: data.attempts + 1 })
      .eq("id", data.id);
    return { ok: false, reason: "invalid" };
  }

  // Single-use: consume the challenge.
  await db.from("otp_codes").delete().eq("id", data.id);
  return { ok: true };
}
