/**
 * OTP provider seam.
 *
 * Phone verification is NOT implemented yet — no SMS/WhatsApp vendor is wired up.
 * `unconfiguredOtpProvider` format-validates the number and lets sign-in through
 * without a code, so the app stays usable while verification is pending.
 *
 * To switch on real verification, add a provider (MSG91, Twilio, or the WhatsApp
 * Business API) implementing `OtpProvider`, return it from `getOtpProvider()`, and
 * set OTP_PROVIDER in the environment. Nothing else in the app needs to change.
 */
import { ServiceError } from "@/types";

export type OtpChannel = "none" | "sms" | "whatsapp";

export interface OtpChallenge {
  channel: OtpChannel;
  /** When false, the UI skips the code step entirely (verification not enabled). */
  codeRequired: boolean;
  expiresInSeconds?: number;
}

export interface OtpProvider {
  readonly channel: OtpChannel;
  sendCode(phone: string): Promise<OtpChallenge>;
  verifyCode(phone: string, code: string): Promise<boolean>;
}

/** The only provider that exists today: no verification, no vendor. */
export const unconfiguredOtpProvider: OtpProvider = {
  channel: "none",
  async sendCode() {
    return { channel: "none", codeRequired: false };
  },
  async verifyCode() {
    throw new ServiceError("Phone verification isn't enabled yet.", "unavailable");
  },
};

export function getOtpProvider(): OtpProvider {
  // Future: switch (process.env.OTP_PROVIDER) { case "msg91": return msg91Provider; ... }
  return unconfiguredOtpProvider;
}

/** True once a real verification channel is configured. */
export const phoneVerificationEnabled = getOtpProvider().channel !== "none";
