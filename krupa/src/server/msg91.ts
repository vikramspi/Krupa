import "server-only";
import { ServiceError } from "@/types";
import { isProduction } from "./env";

/**
 * MSG91 OTP delivery.
 *
 * The raw code is never logged in production and never written to the database —
 * only its HMAC is stored. Without credentials: in development the code is printed
 * to the server console (so the flow is testable); in production the request fails,
 * so nobody can place an order without a genuinely verified number.
 */
/** Overridable only so tests can point at a local stub; defaults to the real API. */
const MSG91_BASE = process.env.MSG91_API_BASE?.trim() || "https://control.msg91.com";
const MSG91_OTP_ENDPOINT = `${MSG91_BASE}/api/v5/otp`;

function maskPhone(phone: string): string {
  return `${phone.slice(0, 2)}••••${phone.slice(-3)}`;
}

export function isSmsConfigured(): boolean {
  return Boolean(process.env.MSG91_AUTH_KEY?.trim() && process.env.MSG91_TEMPLATE_ID?.trim());
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY?.trim();
  const templateId = process.env.MSG91_TEMPLATE_ID?.trim();

  if (!authKey || !templateId) {
    if (isProduction) {
      console.error("[otp] MSG91 not configured — refusing to verify without SMS delivery");
      throw new ServiceError("We can't send verification codes right now. Please call us to book.", "unavailable");
    }
    // Development only. Never reached in production (guarded above).
    console.info(`[otp][dev] code for ${maskPhone(phone)} is ${code} — set MSG91_AUTH_KEY to send real SMS`);
    return;
  }

  const url = new URL(MSG91_OTP_ENDPOINT);
  url.searchParams.set("template_id", templateId);
  url.searchParams.set("mobile", `91${phone}`);
  url.searchParams.set("otp", code);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch {
    throw new ServiceError("We couldn't send your verification code. Please try again.", "network");
  }

  const body = (await response.json().catch(() => null)) as { type?: string; message?: string } | null;
  if (!response.ok || body?.type === "error") {
    // Log the provider's reason, never the code.
    console.error("[otp] MSG91 send failed", { status: response.status, message: body?.message, phone: maskPhone(phone) });
    throw new ServiceError("We couldn't send your verification code. Please try again.", "network");
  }
}
