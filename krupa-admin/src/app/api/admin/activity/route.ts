import { handle, requireAdmin } from "@/server/http";
import { listActivity } from "@/server/repositories/activity";
import type { ActivityItem } from "@/types";

/** GET /api/admin/activity?before=&actor=&entityType=&entityId= — the platform feed, newest first. */
const ACTORS = ["customer", "vendor", "admin", "system"];
const LIMIT = 50;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  const before = Number(params.get("before"));
  const actor = params.get("actor");
  const entityType = params.get("entityType");
  const entityId = params.get("entityId");
  return handle("activity", async () => {
    const items = await listActivity({
      limit: LIMIT,
      beforeId: Number.isInteger(before) && before > 0 ? before : undefined,
      actorType: actor && ACTORS.includes(actor) ? (actor as ActivityItem["actorType"]) : undefined,
      entity: entityType && entityId ? { type: entityType.slice(0, 40), id: entityId.slice(0, 80) } : undefined,
    });
    return Response.json({ items, nextBefore: items.length === LIMIT ? items[items.length - 1].id : null });
  });
}
