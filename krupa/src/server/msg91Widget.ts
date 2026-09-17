import "server-only";
import { createHash } from "node:crypto";
import { ServiceError } from "@/types";

/**
 * MSG91 OTP Widget.
 *
 * The browser sends and verifies the SMS code directly with MSG91 and receives a
 * JWT access token. That token proves nothing until MSG91 itself confirms it:
 * `verifyWidgetAccessToken` calls MSG91's verifyAccessToken with our server-only
 * authkey, and the phone number MSG91 returns — never the one the browser
 * claims — is what gets trusted.
 *
 *   MSG91_WIDGET_ID, MSG91_WIDGET_AUTH_TOKEN  public by design (sent to the browser)
 *   MSG91_AUTHKEY                             server-only
 *
 * Tokens are never logged.
 */
const MSG91_BASE = process.env.MSG91_API_BASE?.trim() || "https://control.msg91.com";
const VERIFY_ACCESS_TOKEN_URL = `${MSG91_BASE}/api/v5/widget/verifyAccessToken`;

export interface WidgetClientConfig {
  widgetId: string;
  tokenAuth: string;
}

export function isWidgetConfigured(): boolean {
  return Boolean(
    process.env.MSG91_WIDGET_ID?.trim() && process.env.MSG91_WIDGET_AUTH_TOKEN?.trim() && process.env.MSG91_AUTHKEY?.trim(),
  );
}

/** What the login page hands the browser. Null when the widget isn't fully configured. */
export function widgetClientConfig(): WidgetClientConfig | null {
  if (!isWidgetConfigured()) return null;
  return { widgetId: process.env.MSG91_WIDGET_ID!.trim(), tokenAuth: process.env.MSG91_WIDGET_AUTH_TOKEN!.trim() };
}

/**
 * A confirmed token is accepted once. This guards against replaying a captured
 * token within the window MSG91 would still accept it. It is per server instance —
 * enough for a single deployment; a multi-region setup would move it to the database.
 */
const USED_TOKEN_TTL_MS = 30 * 60 * 1000;
const usedTokens = new Map<string, number>();

function claimToken(token: string, now = Date.now()): boolean {
  for (const [key, expiry] of usedTokens) if (expiry <= now) usedTokens.delete(key);
  const key = createHash("sha256").update(token).digest("hex");
  if (usedTokens.has(key)) return false;
  usedTokens.set(key, now + USED_TOKEN_TTL_MS);
  return true;
}

export type WidgetTokenCheck = { ok: true; phone: string } | { ok: false; reason: "invalid" | "reused" | "not_indian_mobile" };

/** Returns the 10-digit Indian mobile number MSG91 verified for this token. */
export async function verifyWidgetAccessToken(accessToken: string): Promise<WidgetTokenCheck> {
  const authkey = process.env.MSG91_AUTHKEY?.trim();
  if (!authkey) throw new ServiceError("Phone verification is unavailable right now.", "unavailable");

  let response: Response;
  try {
    response = await fetch(VERIFY_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: { authkey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ "access-token": accessToken }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new ServiceError("We couldn't confirm your code with our SMS provider. Please try again.", "network");
  }

  const body = (await response.json().catch(() => null)) as { type?: unknown; message?: unknown; code?: unknown } | null;

  // MSG91 answers HTTP 200 even for bad tokens — only `type: "success"` counts.
  if (!response.ok || body?.type !== "success" || typeof body.message !== "string") {
    if (body?.message === "AuthenticationFailure" || String(body?.code) === "201") {
      console.error("[otp] MSG91 rejected our authkey — check MSG91_AUTHKEY");
      throw new ServiceError("Phone verification is unavailable right now.", "unavailable");
    }
    console.warn("[otp] MSG91 did not confirm a widget token", { status: response.status, code: body?.code, message: body?.message });
    return { ok: false, reason: "invalid" };
  }

  // MSG91 returns the identifier it verified, e.g. "919820012345".
  const digits = body.message.replace(/\D/g, "");
  const phone = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : null;
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) return { ok: false, reason: "not_indian_mobile" };

  if (!claimToken(accessToken)) return { ok: false, reason: "reused" };
  return { ok: true, phone };
}
