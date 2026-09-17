import "server-only";
import { ServiceError, type AddressLabel, type Customer, type SavedAddress } from "@/types";
import { supabase } from "../supabase";

interface CustomerRow {
  id: string;
  phone: string | null;
  name: string | null;
  created_at: string;
}

/** Auth-relevant columns. Never logged, never returned to the browser. */
export interface CustomerAuthRow {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  password_hash: string | null;
  email_verified_at: string | null;
}

const AUTH_COLUMNS = "id, phone, email, name, password_hash, email_verified_at";

interface AddressRow {
  id: string;
  label: string;
  line1: string;
  line2: string;
  landmark: string | null;
  area_id: string;
  area_name: string;
  pincode: string;
  city: string;
}

const ADDRESS_LABELS: AddressLabel[] = ["Home", "Work", "Other"];
const toLabel = (value: string): AddressLabel => (ADDRESS_LABELS as string[]).includes(value) ? (value as AddressLabel) : "Other";

function toAddress(row: AddressRow): SavedAddress {
  return {
    id: row.id,
    label: toLabel(row.label),
    line1: row.line1,
    line2: row.line2,
    landmark: row.landmark ?? undefined,
    areaId: row.area_id,
    areaName: row.area_name,
    pincode: row.pincode,
    city: row.city,
  };
}

function fail(action: string, message: string): never {
  console.error(`[db] ${action} failed`, { message });
  throw new ServiceError("We couldn't reach our servers. Please try again.", "network");
}

/** Finds the customer for a verified phone, creating them on first sign-in. */
export async function upsertCustomerByPhone(phone: string, name?: string): Promise<CustomerRow> {
  const db = supabase();
  const existing = await db.from("customers").select("id, phone, name, created_at").eq("phone", phone).maybeSingle();
  if (existing.error) fail("customer lookup", existing.error.message);

  if (existing.data) {
    // Fill in a missing name if this sign-in supplied one; never overwrite an existing one.
    if (name?.trim() && !existing.data.name) {
      const updated = await db
        .from("customers")
        .update({ name: name.trim() })
        .eq("id", existing.data.id)
        .select("id, phone, name, created_at")
        .single();
      if (updated.error) fail("customer name update", updated.error.message);
      return updated.data;
    }
    return existing.data;
  }

  const created = await db
    .from("customers")
    .insert({ phone, name: name?.trim() || null })
    .select("id, phone, name, created_at")
    .single();
  if (created.error) fail("customer create", created.error.message);
  return created.data;
}

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const db = supabase();
  const { data, error } = await db
    .from("customers")
    .select("id, phone, email, email_verified_at, name, created_at, addresses ( id, label, line1, line2, landmark, area_id, area_name, pincode, city, created_at )")
    .eq("id", customerId)
    .maybeSingle();
  if (error) fail("customer fetch", error.message);
  if (!data) return null;

  const row = data as unknown as CustomerRow & {
    email: string | null;
    email_verified_at: string | null;
    addresses: (AddressRow & { created_at: string })[];
  };
  return {
    id: row.id,
    // A phone is only ever stored after an OTP challenge succeeds.
    phone: row.phone,
    email: row.email,
    emailVerified: !!row.email_verified_at,
    name: row.name ?? "",
    memberSince: row.created_at.slice(0, 10),
    addresses: [...(row.addresses ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map(toAddress),
  };
}

export async function updateCustomerName(customerId: string, name: string): Promise<void> {
  const { error } = await supabase().from("customers").update({ name: name.trim() }).eq("id", customerId);
  if (error) fail("customer update", error.message);
}

export async function saveCustomerAddress(
  customerId: string,
  address: Omit<SavedAddress, "id"> & { id?: string },
): Promise<SavedAddress> {
  const db = supabase();
  const payload = {
    customer_id: customerId,
    label: address.label,
    line1: address.line1,
    line2: address.line2,
    landmark: address.landmark ?? null,
    area_id: address.areaId,
    area_name: address.areaName,
    pincode: address.pincode,
    city: address.city,
  };
  const columns = "id, label, line1, line2, landmark, area_id, area_name, pincode, city";

  if (address.id) {
    // Scoped by customer_id so one customer can never edit another's address.
    const { data, error } = await db
      .from("addresses")
      .update(payload)
      .eq("id", address.id)
      .eq("customer_id", customerId)
      .select(columns)
      .maybeSingle();
    if (error) fail("address update", error.message);
    if (!data) throw new ServiceError("That address is no longer available.", "not_found");
    return toAddress(data as AddressRow);
  }

  const { data, error } = await db.from("addresses").insert(payload).select(columns).single();
  if (error) fail("address create", error.message);
  return toAddress(data as AddressRow);
}

export async function deleteCustomerAddress(customerId: string, addressId: string): Promise<void> {
  const { error } = await supabase().from("addresses").delete().eq("id", addressId).eq("customer_id", customerId);
  if (error) fail("address delete", error.message);
}


// ─── Email + password ────────────────────────────────────────────────────────

export async function findCustomerByEmail(email: string): Promise<CustomerAuthRow | null> {
  const { data, error } = await supabase().from("customers").select(AUTH_COLUMNS).ilike("email", email).maybeSingle();
  if (error) fail("customer email lookup", error.message);
  return (data as CustomerAuthRow | null) ?? null;
}

export async function findCustomerAuthRow(customerId: string): Promise<CustomerAuthRow | null> {
  const { data, error } = await supabase().from("customers").select(AUTH_COLUMNS).eq("id", customerId).maybeSingle();
  if (error) fail("customer auth lookup", error.message);
  return (data as CustomerAuthRow | null) ?? null;
}

/** Creates an email-only account. The caller must already have hashed the password. */
export async function createEmailCustomer(email: string, passwordHash: string, name: string): Promise<CustomerAuthRow> {
  const { data, error } = await supabase()
    .from("customers")
    .insert({ email: email.toLowerCase(), password_hash: passwordHash, name: name.trim() || null })
    .select(AUTH_COLUMNS)
    .single();
  if (error) fail("email customer create", error.message);
  return data as CustomerAuthRow;
}

export async function markEmailVerified(customerId: string): Promise<void> {
  const { error } = await supabase()
    .from("customers")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", customerId);
  if (error) fail("email verification", error.message);
}

export async function setPasswordHash(customerId: string, passwordHash: string): Promise<void> {
  const { error } = await supabase().from("customers").update({ password_hash: passwordHash }).eq("id", customerId);
  if (error) fail("password update", error.message);
}

/**
 * Attaches a freshly OTP-verified number to an existing (email) account.
 * Refuses when the number already belongs to someone else — merging two accounts
 * is deliberately not supported yet.
 */
export async function attachPhoneToCustomer(customerId: string, phone: string): Promise<void> {
  const db = supabase();
  const existing = await db.from("customers").select("id").eq("phone", phone).maybeSingle();
  if (existing.error) fail("phone conflict check", existing.error.message);
  if (existing.data && existing.data.id !== customerId) {
    throw new ServiceError(
      "That mobile number already has an account. Log in with the number instead.",
      "validation",
    );
  }

  const { error } = await db.from("customers").update({ phone }).eq("id", customerId);
  if (error) fail("phone attach", error.message);
}

/**
 * Values that action links are signed against, so a link dies the moment the
 * action it authorises has been completed.
 */
export function emailVerificationFingerprint(row: CustomerAuthRow): string {
  return `${row.email ?? ""}:${row.email_verified_at ?? ""}`;
}

export function passwordResetFingerprint(row: CustomerAuthRow): string {
  return `${row.password_hash ?? ""}:${row.email_verified_at ?? ""}`;
}

// ─── Google ──────────────────────────────────────────────────────────────────
// google_id is only selected here, so the other sign-in methods keep working on a
// database that hasn't had migration 0005 applied yet.

export interface GoogleAuthRow extends CustomerAuthRow {
  google_id: string | null;
}

const GOOGLE_AUTH_COLUMNS = `${AUTH_COLUMNS}, google_id`;
const UNIQUE_VIOLATION = "23505";

export async function findCustomerByGoogleId(googleId: string): Promise<GoogleAuthRow | null> {
  const { data, error } = await supabase().from("customers").select(GOOGLE_AUTH_COLUMNS).eq("google_id", googleId).maybeSingle();
  if (error) fail("customer google lookup", error.message);
  return (data as GoogleAuthRow | null) ?? null;
}

export async function findGoogleAuthRowByEmail(email: string): Promise<GoogleAuthRow | null> {
  const { data, error } = await supabase().from("customers").select(GOOGLE_AUTH_COLUMNS).ilike("email", email).maybeSingle();
  if (error) fail("customer email lookup", error.message);
  return (data as GoogleAuthRow | null) ?? null;
}

/**
 * Links a Google account to an existing customer found by email.
 *
 * Google has just proved the person owns this address. If the account's email was
 * never confirmed, whoever set its password never proved that — so the email is
 * marked verified and that unproven password is removed, closing the "register
 * someone else's address first" takeover. Returns false if another request linked
 * a different Google account first.
 */
export async function linkGoogleAccount(
  row: GoogleAuthRow,
  googleId: string,
  name: string | null,
): Promise<boolean> {
  const update: Record<string, string | null> = { google_id: googleId };
  if (!row.email_verified_at) {
    update.email_verified_at = new Date().toISOString();
    update.password_hash = null;
  }
  // An unconfirmed account's name was never proven either.
  if (name && (!row.name || !row.email_verified_at)) update.name = name;

  const { data, error } = await supabase()
    .from("customers")
    .update(update)
    .eq("id", row.id)
    .is("google_id", null)
    .select("id");
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return false;
    fail("google link", error.message);
  }
  return (data ?? []).length === 1;
}

/** Creates a Google account. Returns null if the email or Google id was taken concurrently. */
export async function createGoogleCustomer(email: string, googleId: string, name: string | null): Promise<GoogleAuthRow | null> {
  const { data, error } = await supabase()
    .from("customers")
    .insert({ email: email.toLowerCase(), google_id: googleId, name, email_verified_at: new Date().toISOString() })
    .select(GOOGLE_AUTH_COLUMNS)
    .single();
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null;
    fail("google customer create", error.message);
  }
  return data as GoogleAuthRow;
}
