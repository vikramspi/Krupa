import "server-only";
import { ServiceError } from "@/types";

/**
 * What Postgres says when the deployed code queries a column or table the
 * database hasn't got — a migration that shipped but was never run.
 */
const SCHEMA_DRIFT = /does not exist|schema cache|undefined column|undefined table/i;

/**
 * Every repository's `fail` ends up here.
 *
 * Schema drift and a genuine outage look identical to a visitor, so both get
 * the same calm line — but they are nothing alike to whoever has to fix it, and
 * logging them the same way is what made the last one so expensive. Migration
 * 0008 shipped unapplied; every vendor query failed on a missing column; and
 * the site reported "we couldn't reach our servers" while the connection was
 * perfectly fine, so nobody thought to look at the schema. The log now names
 * the cause outright.
 */
export function reportDbError(action: string, message: string): never {
  const hint = SCHEMA_DRIFT.test(message)
    ? " — THE DATABASE IS BEHIND THE CODE: apply the unapplied files in supabase/migrations, then run scripts/check-db-schema.mjs"
    : "";
  console.error(`[db] ${action} failed${hint}`, { message });
  throw new ServiceError("We couldn't reach our servers. Please try again.", "network");
}
