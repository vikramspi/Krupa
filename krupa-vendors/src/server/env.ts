import "server-only";

/** Reads a required server-side secret, failing loudly rather than silently misbehaving. */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}. See .env.example.`);
  return value;
}

export const isProduction = process.env.NODE_ENV === "production";

/** True when Supabase is configured; lets routes return a clear 503 instead of crashing. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
