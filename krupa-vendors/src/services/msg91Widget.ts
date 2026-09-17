"use client";

import { ServiceError } from "@/types";

/**
 * Browser side of the MSG91 OTP Widget, in headless mode (`exposeMethods: true`):
 * MSG91's popup never shows — our own form calls `sendOtp` / `verifyOtp` /
 * `retryOtp`, and MSG91 renders only its captcha into our container.
 *
 * `verify` resolves to an access token that is worthless on its own: the server
 * confirms it with MSG91 before trusting the number.
 */
export interface WidgetConfig {
  widgetId: string;
  tokenAuth: string;
}

type Callback = (data: unknown) => void;

interface WidgetData {
  captchaValidations?: unknown;
  otpLength?: unknown;
  expiryTime?: unknown;
  retryTime?: unknown;
}

export interface WidgetSettings {
  otpLength: number;
  expiryMinutes: number;
  retrySeconds: number;
}

/** OTP length, expiry and resend delay as configured in the MSG91 dashboard. */
export function widgetSettings(): WidgetSettings {
  const data = window.getWidgetData?.();
  const int = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  };
  return {
    otpLength: int(data?.otpLength, 6, 4, 9),
    expiryMinutes: int(data?.expiryTime, 0, 1, 1440),
    retrySeconds: int(data?.retryTime, 30, 5, 600),
  };
}

declare global {
  interface Window {
    initSendOTP?: (config: Record<string, unknown>) => void;
    sendOtp?: (identifier: string, success?: Callback, failure?: Callback) => void;
    verifyOtp?: (otp: string | number, success?: Callback, failure?: Callback, reqId?: string) => void;
    retryOtp?: (channel: string | null, success?: Callback, failure?: Callback, reqId?: string) => void;
    isCaptchaVerified?: () => boolean;
    getWidgetData?: () => WidgetData | undefined;
  }
}

const SCRIPT_URL = "https://verify.msg91.com/otp-provider.js";
export const MSG91_CAPTCHA_ID = "msg91-captcha";
/** SMS retry channel, per MSG91's widget docs. */
const SMS_CHANNEL = "11";

let scriptPromise: Promise<void> | null = null;
let initialisedFor: HTMLElement | null = null;

function loadScript(): Promise<void> {
  if (window.initSendOTP) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      script.remove();
      reject(new ServiceError("We couldn't load phone verification. Check your connection and try again.", "network"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/** Waits until MSG91 has finished bootstrapping and exposed its methods. */
async function waitForMethods(timeoutMs = 15_000): Promise<void> {
  const started = Date.now();
  while (!(window.sendOtp && window.verifyOtp && window.retryOtp)) {
    if (Date.now() - started > timeoutMs) {
      throw new ServiceError("Phone verification is taking too long to load. Please refresh and try again.", "network");
    }
    await new Promise((r) => setTimeout(r, 100));
  }
}

/**
 * Loads the widget and binds its captcha to `captchaContainer` (which must carry
 * id={MSG91_CAPTCHA_ID}). Safe to call repeatedly; it only re-initialises when the
 * container element itself has been replaced.
 */
export async function initWidget(config: WidgetConfig, captchaContainer: HTMLElement): Promise<void> {
  await loadScript();
  if (initialisedFor !== captchaContainer || !captchaContainer.isConnected) {
    initialisedFor = captchaContainer;
    window.initSendOTP!({
      widgetId: config.widgetId,
      tokenAuth: config.tokenAuth,
      exposeMethods: true,
      captchaRenderId: MSG91_CAPTCHA_ID,
      // Required by otp-provider.js even in headless mode; per-call callbacks do the work.
      success: () => {},
      failure: () => {},
    });
  }
  await waitForMethods();
}

function toError(data: unknown, fallback: string): ServiceError {
  const message = data && typeof data === "object" && "message" in data ? String((data as { message: unknown }).message) : "";
  // MSG91's messages are short and customer-safe ("OTP not match", "Mobile no. not valid"…).
  return new ServiceError(message && message.length < 140 ? friendly(message) : fallback, "validation");
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("otp") && (m.includes("not match") || m.includes("invalid") || m.includes("incorrect"))) {
    return "That code doesn't match. Please check and try again.";
  }
  if (m.includes("expire")) return "That code has expired. Please request a new one.";
  if (m.includes("captcha")) return "Please complete the captcha check first.";
  if (m.includes("limit") || m.includes("too many") || m.includes("exceed")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  return message;
}

const looksLikeJwt = (value: string) => /^eyJ[\w-]*\.[\w-]+\.[\w-]+$/.test(value);

function tokenFrom(data: unknown): string | null {
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    for (const key of ["message", "access-token", "accessToken", "token"]) {
      if (typeof d[key] === "string" && (d[key] as string).length > 20) return d[key] as string;
    }
  }
  return null;
}

/** True when MSG91 wants a captcha and the customer hasn't completed it yet. */
export function captchaPending(): boolean {
  const needsCaptcha = Boolean(window.getWidgetData?.()?.captchaValidations);
  return needsCaptcha && window.isCaptchaVerified?.() === false;
}

/**
 * Sends an SMS code to a 10-digit Indian mobile number. With MSG91's invisible
 * verification the number can be confirmed without a code — then the access token
 * comes straight back and the code step is skipped.
 */
export function sendCode(phone: string): Promise<{ accessToken: string | null }> {
  if (captchaPending()) return Promise.reject(new ServiceError("Please tick the captcha box first.", "validation"));
  return new Promise((resolve, reject) => {
    window.sendOtp!(
      `91${phone}`,
      (data) => {
        const token = tokenFrom(data);
        resolve({ accessToken: token && looksLikeJwt(token) ? token : null });
      },
      (error) => reject(toError(error, "We couldn't send your code. Please try again.")),
    );
  });
}

export function resendCode(): Promise<void> {
  return new Promise((resolve, reject) => {
    window.retryOtp!(
      SMS_CHANNEL,
      () => resolve(),
      (error) => reject(toError(error, "We couldn't resend your code. Please try again.")),
    );
  });
}

/** Checks the code with MSG91 and returns the access token for the server to confirm. */
export function verifyCode(code: string): Promise<string> {
  return new Promise((resolve, reject) => {
    window.verifyOtp!(
      code,
      (data) => {
        const token = tokenFrom(data);
        if (token) resolve(token);
        else reject(new ServiceError("We couldn't verify your code. Please try again.", "network"));
      },
      (error) => reject(toError(error, "That code doesn't match. Please check and try again.")),
    );
  });
}
