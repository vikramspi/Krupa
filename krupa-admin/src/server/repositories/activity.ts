import "server-only";
import type { ActivityItem } from "@/types";
import { supabase } from "../supabase";
import { fail } from "./shared";

interface Row {
  id: number;
  created_at: string;
  actor_type: ActivityItem["actorType"];
  actor_label: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
}

const toItem = (row: Row): ActivityItem => ({
  id: row.id,
  createdAt: row.created_at,
  actorType: row.actor_type,
  actorLabel: row.actor_label,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  summary: row.summary,
});

/** Newest first; `beforeId` pages backwards. */
export async function listActivity(options: {
  limit: number;
  beforeId?: number;
  actorType?: ActivityItem["actorType"];
  entity?: { type: string; id: string };
}): Promise<ActivityItem[]> {
  let query = supabase()
    .from("activity_log")
    .select("id, created_at, actor_type, actor_label, action, entity_type, entity_id, summary")
    .order("id", { ascending: false })
    .limit(options.limit);
  if (options.beforeId) query = query.lt("id", options.beforeId);
  if (options.actorType) query = query.eq("actor_type", options.actorType);
  if (options.entity) query = query.eq("entity_type", options.entity.type).eq("entity_id", options.entity.id);
  const { data, error } = await query;
  if (error) fail("activity list", error.message);
  return (data as Row[]).map(toItem);
}
