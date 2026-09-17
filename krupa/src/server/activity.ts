import "server-only";
import { after } from "next/server";
import { supabase } from "./supabase";

/**
 * Appends to the platform-wide activity feed shown in the admin panel.
 *
 * Written after the response is sent, and never allowed to fail a request. Keep
 * summaries human-readable and free of secrets; never put codes, tokens or
 * passwords in `details`.
 */
export interface ActivityEntry {
  actorType: "customer" | "vendor" | "admin" | "system";
  actorId?: string | null;
  actorLabel?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  summary: string;
  details?: Record<string, unknown>;
}

async function write(entry: ActivityEntry): Promise<void> {
  const { error } = await supabase().from("activity_log").insert({
    actor_type: entry.actorType,
    actor_id: entry.actorId ?? null,
    actor_label: entry.actorLabel ?? null,
    action: entry.action,
    entity_type: entry.entityType ?? null,
    entity_id: entry.entityId ?? null,
    summary: entry.summary,
    details: entry.details ?? {},
  });
  // A missing table (migration 0007 not applied) is not worth failing anything over.
  if (error && error.code !== "PGRST205") console.error("[activity] write failed", { action: entry.action, message: error.message });
}

export function logActivity(entry: ActivityEntry): void {
  try {
    after(() => write(entry));
  } catch {
    // Outside a request scope (scripts): write directly.
    void write(entry);
  }
}

/** "Vikram Kanaujiya" → "Vikram K.", for feed lines. */
export function shortName(name: string | null | undefined, fallback = "A customer"): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.` : parts[0];
}
