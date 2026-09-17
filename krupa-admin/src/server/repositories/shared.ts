import "server-only";
import { ServiceError } from "@/types";

export function fail(action: string, message: string): never {
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
