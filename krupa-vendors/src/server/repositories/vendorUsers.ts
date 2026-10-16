import "server-only";
import type { VendorSessionUser } from "@/types";
import { supabase } from "../supabase";
import { reportDbError } from "./dbError";

function fail(action: string, message: string): never {
  reportDbError(action, message);
}

/** Auth columns. Never logged, never sent to the browser. */
export interface VendorUserAuthRow {
  id: string;
  vendor_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  password_hash: string | null;
  invite_token_hash: string | null;
  invite_expires_at: string | null;
  reset_token_hash: string | null;
  reset_expires_at: string | null;
  is_active: boolean;
}

const AUTH_COLUMNS =
  "id, vendor_id, name, phone, email, password_hash, invite_token_hash, invite_expires_at, reset_token_hash, reset_expires_at, is_active";

interface SessionRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean;
  vendors: { id: string; name: string; is_active: boolean } | null;
}

export async function findSessionUser(userId: string): Promise<VendorSessionUser | null> {
  const { data, error } = await supabase()
    .from("vendor_users")
    .select("id, name, phone, email, is_active, vendors ( id, name, is_active )")
    .eq("id", userId)
    .maybeSingle();
  if (error) fail("partner session lookup", error.message);
  const row = data as unknown as SessionRow | null;
  if (!row || !row.is_active || !row.vendors) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    vendor: { id: row.vendors.id, name: row.vendors.name, isActive: row.vendors.is_active },
  };
}

/** The shop itself, used to decide who may open a login for it. */
export interface VendorContactRow {
  id: string;
  name: string;
  is_active: boolean;
}

/**
 * `contact_email` only exists once migration 0008 has been applied. Before that
 * the column isn't there and Postgres rejects the whole query (42703), so treat
 * a missing column as "no shop matches" rather than taking sign-in down with
 * it — the same tolerance the admin panel gives these columns.
 */
const MISSING_COLUMN = /42703|does not exist|schema cache/i;

export async function findVendorByContactEmail(email: string): Promise<VendorContactRow | null> {
  const { data, error } = await supabase()
    .from("vendors")
    .select("id, name, is_active")
    .ilike("contact_email", email)
    .maybeSingle();
  if (error) {
    if (MISSING_COLUMN.test(`${error.code ?? ""} ${error.message}`)) {
      console.warn("[db] vendors.contact_email is missing — apply migration 0008 to let partners sign in by email");
      return null;
    }
    fail("vendor contact email lookup", error.message);
  }
  return (data as VendorContactRow | null) ?? null;
}

export async function findVendorByContactPhone(phone: string): Promise<VendorContactRow | null> {
  const { data, error } = await supabase()
    .from("vendors")
    .select("id, name, is_active")
    .eq("contact_phone", phone)
    .maybeSingle();
  if (error) fail("vendor contact phone lookup", error.message);
  return (data as VendorContactRow | null) ?? null;
}

/** Opens the first login for a shop, at the moment its owner first signs in. */
export async function createUserForVendor(
  vendorId: string,
  input: { name: string; email: string | null; phone: string | null },
): Promise<{ id: string }> {
  const { data, error } = await supabase()
    .from("vendor_users")
    .insert({ vendor_id: vendorId, name: input.name.slice(0, 80), email: input.email, phone: input.phone, is_active: true })
    .select("id")
    .single();
  if (error) fail("partner login create", error.message);
  return data as { id: string };
}

export async function findUserByEmail(email: string): Promise<VendorUserAuthRow | null> {
  const { data, error } = await supabase().from("vendor_users").select(AUTH_COLUMNS).ilike("email", email).maybeSingle();
  if (error) fail("partner email lookup", error.message);
  return (data as VendorUserAuthRow | null) ?? null;
}

export async function findUserByPhone(phone: string): Promise<VendorUserAuthRow | null> {
  const { data, error } = await supabase().from("vendor_users").select(AUTH_COLUMNS).eq("phone", phone).maybeSingle();
  if (error) fail("partner phone lookup", error.message);
  return (data as VendorUserAuthRow | null) ?? null;
}

/** A pending invite or reset link, matched by its hash. */
export async function findUserByLinkHash(kind: "invite" | "reset", hash: string): Promise<VendorUserAuthRow | null> {
  const column = kind === "invite" ? "invite_token_hash" : "reset_token_hash";
  const { data, error } = await supabase().from("vendor_users").select(AUTH_COLUMNS).eq(column, hash).maybeSingle();
  if (error) fail("partner link lookup", error.message);
  return (data as VendorUserAuthRow | null) ?? null;
}

export async function setResetToken(userId: string, hash: string, expiresAt: Date): Promise<void> {
  const { error } = await supabase()
    .from("vendor_users")
    .update({ reset_token_hash: hash, reset_expires_at: expiresAt.toISOString() })
    .eq("id", userId);
  if (error) fail("partner reset token", error.message);
}

/** Sets the password and burns every outstanding invite/reset link, in one write. */
export async function setPasswordAndClearLinks(userId: string, passwordHash: string): Promise<void> {
  const { error } = await supabase()
    .from("vendor_users")
    .update({
      password_hash: passwordHash,
      invite_token_hash: null,
      invite_expires_at: null,
      reset_token_hash: null,
      reset_expires_at: null,
    })
    .eq("id", userId);
  if (error) fail("partner password update", error.message);
}

export async function recordLogin(userId: string): Promise<void> {
  const { error } = await supabase().from("vendor_users").update({ last_login_at: new Date().toISOString() }).eq("id", userId);
  if (error) console.error("[db] partner last-login update failed", { message: error.message });
}
