import "server-only";
import type { GoogleProfile } from "./google";
import {
  createGoogleCustomer,
  findCustomerByGoogleId,
  findGoogleAuthRowByEmail,
  linkGoogleAccount,
} from "./repositories/customers";

export type GoogleSignInResult =
  | { ok: true; customerId: string; phone: string | null; outcome: "existing" | "linked" | "created" }
  | { ok: false; reason: "email_unverified" | "conflict" };

/**
 * Resolves a Google profile to a customer:
 *   1. match on google_id — the stable identifier;
 *   2. otherwise match on email and link this Google account to it;
 *   3. otherwise create a new, password-less account.
 *
 * The returned phone is whatever the account already has — a Google sign-in never
 * verifies a phone, so checkout stays gated exactly as for the other methods.
 */
export async function signInWithGoogle(profile: GoogleProfile, attempt = 0): Promise<GoogleSignInResult> {
  // An unverified Google email proves nothing about the address, so it can't be matched or stored.
  if (!profile.emailVerified) return { ok: false, reason: "email_unverified" };

  const byGoogle = await findCustomerByGoogleId(profile.sub);
  if (byGoogle) return { ok: true, customerId: byGoogle.id, phone: byGoogle.phone, outcome: "existing" };

  const byEmail = await findGoogleAuthRowByEmail(profile.email);
  if (byEmail) {
    // A concurrent sign-in for this same person linked it between the two lookups.
    if (byEmail.google_id === profile.sub) {
      return { ok: true, customerId: byEmail.id, phone: byEmail.phone, outcome: "existing" };
    }
    // The address is already tied to a different Google account.
    if (byEmail.google_id) return { ok: false, reason: "conflict" };
    if (await linkGoogleAccount(byEmail, profile.sub, profile.name)) {
      return { ok: true, customerId: byEmail.id, phone: byEmail.phone, outcome: "linked" };
    }
  } else {
    const created = await createGoogleCustomer(profile.email, profile.sub, profile.name);
    if (created) return { ok: true, customerId: created.id, phone: created.phone, outcome: "created" };
  }

  // Lost a race with a concurrent sign-in for the same person: resolve again once.
  if (attempt === 0) return signInWithGoogle(profile, 1);
  return { ok: false, reason: "conflict" };
}
