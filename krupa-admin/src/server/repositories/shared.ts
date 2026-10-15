import "server-only";
import { ServiceError } from "@/types";

/**
 * What Postgres says when the deployed code queries a column or table the
 * database hasn't got — a migration that shipped but was never run.
 */
const SCHEMA_DRIFT = /does not exist|schema cache|undefined column|undefined table/i;

export function fail(action: string, message: string): never {
  // Schema drift is not an outage, and calling it one is expensive: migration
  // 0008 shipped unapplied, every vendor query failed on a missing column, and
  // this panel told its own operators "we couldn't reach the database" while
  // the connection was fine. Staff can act on the real cause, so name it.
  if (SCHEMA_DRIFT.test(message)) {
    console.error(`[db] ${action} failed — the database is behind the code`, { message });
    throw new ServiceError(
      "The database is missing a change this build expects. Apply the pending files in supabase/migrations.",
      "unavailable",
    );
  }
  console.error(`[db] ${action} failed`, { message });
  throw new ServiceError("We couldn't reach the database. Please try again.", "network");
}

/** Postgres numerics arrive as strings over PostgREST. */
export const num = (value: number | string | null | undefined): number | null =>
  value === null || value === undefined || value === "" ? null : typeof value === "number" ? value : Number(value);

/** Escapes a user search term for PostgREST `ilike` filters inside `or()`. */
export function likeTerm(term: string): string {
  return `%${term.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/[,()]/g, " ")}%`;
}

export const PAGE_SIZE = 25;
