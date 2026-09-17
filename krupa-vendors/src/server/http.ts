import "server-only";
import type { VendorSessionUser } from "@/types";
import { isDatabaseConfigured } from "./env";
import { findSessionUser } from "./repositories/vendorUsers";
import { clearSession, readSession } from "./session";

export function jsonError(message: string, status: number, code: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error: { message, code, ...extra } }, { status });
}

export function guardDatabase(): Response | null {
  if (isDatabaseConfigured()) return null;
  console.error("[api] Supabase is not configured");
  return jsonError("The partner portal is temporarily unavailable.", 503, "unavailable");
}

/**
 * The signed-in partner, re-checked against the database on every call: a login
 * the operator deactivated (or deleted) stops working immediately.
 */
export async function requireVendor(): Promise<{ user: VendorSessionUser; response?: never } | { user?: never; response: Response }> {
  const session = await readSession();
  if (!session) return { response: jsonError("Please log in to continue.", 401, "unauthorised") };
  const user = await findSessionUser(session.userId);
  if (!user || user.vendor.id !== session.vendorId) {
    await clearSession();
    return { response: jsonError("Your login is no longer active. Please contact Krupa Laundry.", 401, "unauthorised") };
  }
  return { user };
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
