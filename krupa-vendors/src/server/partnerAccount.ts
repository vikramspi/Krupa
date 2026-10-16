import "server-only";
import type { VendorSessionUser } from "@/types";
import { logActivity } from "./activity";
import {
  createUserForVendor,
  findSessionUser,
  findUserByEmail,
  findUserByPhone,
  findVendorByContactEmail,
  findVendorByContactPhone,
  recordLogin,
} from "./repositories/vendorUsers";
import { writeSession } from "./session";

/**
 * Who counts as a partner.
 *
 * A `vendor_users` row is the login; the `vendors` row is the shop. Until now
 * only an admin could create the first login for a shop, by hand, from the
 * admin vendor page — and that page was down for weeks, so not one partner ever
 * got an account. The Email tab, the invite link and "forgot password" all
 * looked broken when the truth was simply that nobody had a login yet.
 *
 * So the shop itself is the record of who may sign in. A verified email or
 * mobile matching `vendors.contact_email` / `vendors.contact_phone` IS the
 * partner, and their login row is created the first time they actually sign in.
 * Admins can still add further logins per shop; this only removes the
 * requirement that one of them go first.
 *
 * The trust boundary is unchanged from the phone tab that already shipped:
 * whoever controls the contact details we hold for a shop can act for that shop.
 */

export type PartnerLookup =
  | { ok: true; user: VendorSessionUser; created: boolean }
  | { ok: false; reason: "unknown" | "inactive" };

/** Opens a session for a user we've already authenticated. */
async function openSession(user: VendorSessionUser, created: boolean, how: string): Promise<PartnerLookup> {
  await writeSession(user.id, user.vendor.id);
  await recordLogin(user.id);
  logActivity({
    actorType: "vendor",
    actorId: user.id,
    actorLabel: `${user.name} (${user.vendor.name})`,
    action: created ? "vendor.login_created" : "vendor.signed_in",
    entityType: "vendor",
    entityId: user.vendor.id,
    summary: created
      ? `${user.name} signed in to the partner portal for ${user.vendor.name} for the first time (${how}), creating their login`
      : `${user.name} signed in to the partner portal for ${user.vendor.name} (${how})`,
  });
  return { ok: true, user, created };
}

/**
 * Resolves an already-verified email to a partner session, creating the login
 * on first use. The caller must have proved the person controls the address —
 * a Google ID token with `email_verified`, or an emailed code.
 */
export async function signInWithVerifiedEmail(email: string, displayName: string | null, how: string): Promise<PartnerLookup> {
  const existing = await findUserByEmail(email);
  if (existing) {
    if (!existing.is_active) return { ok: false, reason: "inactive" };
    const user = await findSessionUser(existing.id);
    if (!user) return { ok: false, reason: "inactive" };
    return openSession(user, false, how);
  }

  const vendor = await findVendorByContactEmail(email);
  if (!vendor) return { ok: false, reason: "unknown" };
  if (!vendor.is_active) return { ok: false, reason: "inactive" };

  // Name the login after the person Google gave us where we have it, so a shop
  // with several logins stays readable; otherwise fall back to the shop's name.
  const created = await createUserForVendor(vendor.id, {
    name: displayName?.trim() || vendor.name,
    email,
    phone: null,
  });
  const user = await findSessionUser(created.id);
  if (!user) return { ok: false, reason: "inactive" };
  return openSession(user, true, how);
}

/**
 * The same, for a mobile number already verified by SMS. Mirrors the phone tab
 * that shipped first, which refused any number without a login row.
 */
export async function signInWithVerifiedPhone(phone: string, how: string): Promise<PartnerLookup> {
  const existing = await findUserByPhone(phone);
  if (existing) {
    if (!existing.is_active) return { ok: false, reason: "inactive" };
    const user = await findSessionUser(existing.id);
    if (!user) return { ok: false, reason: "inactive" };
    return openSession(user, false, how);
  }

  const vendor = await findVendorByContactPhone(phone);
  if (!vendor) return { ok: false, reason: "unknown" };
  if (!vendor.is_active) return { ok: false, reason: "inactive" };

  const created = await createUserForVendor(vendor.id, { name: vendor.name, email: null, phone });
  const user = await findSessionUser(created.id);
  if (!user) return { ok: false, reason: "inactive" };
  return openSession(user, true, how);
}

/**
 * Is this email allowed to sign in at all? Used to refuse before sending a code
 * or an email, so we never post to an address that has no shop behind it.
 */
export async function emailCanSignIn(email: string): Promise<boolean> {
  if (await findUserByEmail(email)) return true;
  const vendor = await findVendorByContactEmail(email);
  return Boolean(vendor?.is_active);
}

/**
 * The login row for an email, created if the address belongs to a shop that has
 * never signed in. Opens no session — this is for "forgot password", where the
 * whole point is that we email a link rather than letting anyone straight in.
 */
export async function findOrCreateLoginForEmail(
  email: string,
): Promise<{ id: string; name: string; created: boolean } | null> {
  const existing = await findUserByEmail(email);
  if (existing) return existing.is_active ? { id: existing.id, name: existing.name, created: false } : null;

  const vendor = await findVendorByContactEmail(email);
  if (!vendor?.is_active) return null;
  const created = await createUserForVendor(vendor.id, { name: vendor.name, email, phone: null });
  logActivity({
    actorType: "vendor",
    actorId: created.id,
    actorLabel: vendor.name,
    action: "vendor.login_created",
    entityType: "vendor",
    entityId: vendor.id,
    summary: `A partner login was opened for ${vendor.name} from a password-setup request`,
  });
  return { id: created.id, name: vendor.name, created: true };
}

/** The same check for a mobile number. */
export async function phoneCanSignIn(phone: string): Promise<boolean> {
  if (await findUserByPhone(phone)) return true;
  const vendor = await findVendorByContactPhone(phone);
  return Boolean(vendor?.is_active);
}
