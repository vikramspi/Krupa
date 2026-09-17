import "server-only";
import type { AdminCustomerRow } from "@/types";
import { supabase } from "../supabase";
import { fail, likeTerm, PAGE_SIZE } from "./shared";

interface Row {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  email_verified_at: string | null;
  google_id: string | null;
  created_at: string;
  orders: { count: number }[];
}

const toRow = (row: Row): AdminCustomerRow => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  email: row.email,
  emailVerified: Boolean(row.email_verified_at),
  google: Boolean(row.google_id),
  createdAt: row.created_at,
  orderCount: row.orders?.[0]?.count ?? 0,
});

const SELECT = "id, name, phone, email, email_verified_at, google_id, created_at, orders ( count )";

export async function listCustomers(search: string | undefined, page: number): Promise<{ customers: AdminCustomerRow[]; total: number }> {
  let query = supabase().from("customers").select(SELECT, { count: "exact" }).order("created_at", { ascending: false });
  const term = search?.trim();
  if (term) {
    const digits = term.replace(/\D/g, "");
    query =
      digits.length >= 6
        ? query.ilike("phone", likeTerm(digits.slice(-10)))
        : query.or(`name.ilike.${likeTerm(term)},email.ilike.${likeTerm(term)}`);
  }
  const from = (page - 1) * PAGE_SIZE;
  const { data, error, count } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) fail("customer list", error.message);
  return { customers: (data as unknown as Row[]).map(toRow), total: count ?? 0 };
}

export async function findCustomer(id: string): Promise<(AdminCustomerRow & { addresses: number }) | null> {
  const { data, error } = await supabase()
    .from("customers")
    .select(`${SELECT}, addresses ( count )`)
    .eq("id", id)
    .maybeSingle();
  if (error) fail("customer fetch", error.message);
  if (!data) return null;
  const row = data as unknown as Row & { addresses: { count: number }[] };
  return { ...toRow(row), addresses: row.addresses?.[0]?.count ?? 0 };
}
