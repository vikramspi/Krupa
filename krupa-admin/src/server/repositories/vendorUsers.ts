import "server-only";
import { ServiceError, type AdminVendorUser } from "@/types";
import { supabase } from "../supabase";
import { fail } from "./shared";

interface Row {
  id: string;
  vendor_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  password_hash: string | null;
  invite_expires_at: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

const COLUMNS = "id, vendor_id, name, phone, email, password_hash, invite_expires_at, is_active, last_login_at, created_at";

const toUser = (row: Row): AdminVendorUser => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  isActive: row.is_active,
  // Only whether a password exists ever leaves the server — never the hash.
  hasPassword: Boolean(row.password_hash),
  invitePending: Boolean(row.invite_expires_at && new Date(row.invite_expires_at).getTime() > Date.now()),
  lastLoginAt: row.last_login_at,
  createdAt: row.created_at,
});

export async function listVendorUsers(vendorId: string): Promise<AdminVendorUser[]> {
  const { data, error } = await supabase().from("vendor_users").select(COLUMNS).eq("vendor_id", vendorId).order("created_at");
  if (error) fail("vendor login list", error.message);
  return (data as Row[]).map(toUser);
}

export async function findVendorUser(id: string): Promise<(AdminVendorUser & { vendorId: string }) | null> {
  const { data, error } = await supabase().from("vendor_users").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) fail("vendor login fetch", error.message);
  return data ? { ...toUser(data as Row), vendorId: (data as Row).vendor_id } : null;
}

const UNIQUE_VIOLATION = "23505";

export async function createVendorUser(vendorId: string, input: { name: string; phone: string | null; email: string | null }): Promise<AdminVendorUser> {
  const { data, error } = await supabase()
    .from("vendor_users")
    .insert({ vendor_id: vendorId, name: input.name, phone: input.phone, email: input.email?.toLowerCase() ?? null })
    .select(COLUMNS)
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    throw new ServiceError("That mobile number or email already has a partner login.", "validation");
  }
  if (error) fail("vendor login create", error.message);
  return toUser(data as Row);
}

export async function setVendorUserActive(id: string, isActive: boolean): Promise<void> {
  // Deactivating also burns any outstanding invite/reset links.
  const update = isActive
    ? { is_active: true }
    : { is_active: false, invite_token_hash: null, invite_expires_at: null, reset_token_hash: null, reset_expires_at: null };
  const { error } = await supabase().from("vendor_users").update(update).eq("id", id);
  if (error) fail("vendor login update", error.message);
}

export async function setInvite(id: string, hash: string, expiresAt: Date): Promise<void> {
  const { error } = await supabase()
    .from("vendor_users")
    .update({ invite_token_hash: hash, invite_expires_at: expiresAt.toISOString() })
    .eq("id", id);
  if (error) fail("vendor invite", error.message);
}
