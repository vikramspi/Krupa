import "server-only";
import { ServiceError } from "@/types";
import { isAdminEmail } from "./admins";
import { isDatabaseConfigured } from "./env";
import { readSession, type AdminSession } from "./session";

export function jsonError(message: string, status: number, code: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error: { message, code, ...extra } }, { status });
}

/** Every admin API route starts here: database configured, signed in, still on the allowlist. */
export async function requireAdmin(): Promise<{ admin: AdminSession; response?: never } | { admin?: never; response: Response }> {
  if (!isDatabaseConfigured()) return { response: jsonError("The database isn't configured.", 503, "unavailable") };
  const admin = await readSession();
  if (!admin || !isAdminEmail(admin.email)) return { response: jsonError("Please sign in as an admin.", 401, "unauthorised") };
  return { admin };
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** Wraps a handler body: ServiceErrors become 503s, anything else a logged 500. */
export async function handle(label: string, fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ServiceError) {
      const status = error.code === "validation" ? 400 : error.code === "not_found" ? 404 : 503;
      return jsonError(error.message, status, error.code);
    }
    console.error(`[admin] ${label} failed`, error instanceof Error ? error.message : error);
    return jsonError("Something went wrong. Please try again.", 500, "server_error");
  }
}

export function adminLabel(admin: AdminSession): string {
  return admin.name ? `${admin.name} (admin)` : "Admin";
}
