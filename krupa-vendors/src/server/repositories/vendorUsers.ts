import "server-only";
import { ServiceError, type VendorSessionUser } from "@/types";
import { supabase } from "../supabase";

function fail(action: string, message: string): never {
  console.error(`[db] ${action} failed`, { message });
  throw new ServiceError("We couldn't reach our servers. Please try again.", "network");
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
