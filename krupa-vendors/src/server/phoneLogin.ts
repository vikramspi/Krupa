import "server-only";
import type { VendorSessionUser } from "@/types";
import { signInWithVerifiedPhone } from "./partnerAccount";

/**
 * Opens a session for a phone number that has ALREADY been verified by SMS.
 *
 * Resolved through `partnerAccount`, so a shop's own `contact_phone` works on
 * its first ever sign-in instead of requiring an admin to have created the
 * login beforehand.
 */
export async function completePhoneLogin(verifiedPhone: string): Promise<VendorSessionUser | null> {
  const result = await signInWithVerifiedPhone(verifiedPhone, "SMS code");
  return result.ok ? result.user : null;
}
