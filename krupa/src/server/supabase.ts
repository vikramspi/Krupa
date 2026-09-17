import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./env";

/**
 * Service-role Supabase client — server-side only.
 *
 * The service role key bypasses RLS, so this module must never be imported from a
 * client component. Authorisation is enforced in the route handlers by matching the
 * session cookie's phone against the data being requested.
 */
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "X-Client-Info": "krupa-laundry-web" } },
    });
  }
  return client;
}

/** Test seam: lets verification scripts swap in a stub. */
export function __setSupabaseClientForTests(stub: SupabaseClient | null): void {
  client = stub;
}
