import "server-only";
import { isDatabaseConfigured } from "./env";
import { readSession, type Session } from "./session";

export function jsonError(message: string, status: number, code: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error: { message, code, ...extra } }, { status });
}

/** Returns a 503 response when Supabase isn't configured, else null. */
export function guardDatabase(): Response | null {
  if (isDatabaseConfigured()) return null;
  console.error("[api] Supabase is not configured");
  return jsonError("Our booking system is temporarily unavailable. Please call us to book.", 503, "unavailable");
}

/** Either the verified session, or a 401 response to return as-is. */
export async function requireSession(): Promise<{ session: Session; response?: never } | { session?: never; response: Response }> {
  const session = await readSession();
  if (!session) return { response: jsonError("Please verify your mobile number to continue.", 401, "unauthorised") };
  return { session };
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
