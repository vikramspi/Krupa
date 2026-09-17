import { z } from "zod";
import { logActivity } from "@/server/activity";
import { adminLabel, handle, jsonError, readJson, requireAdmin } from "@/server/http";
import { findOrder, setOrderStatus } from "@/server/repositories/orders";

/**
 * POST /api/admin/orders/{code}/status — operator override to any status.
 * The note is shown to the customer on their tracking timeline.
 */
const schema = z.object({
  to: z.enum(["placed", "vendor_assigned", "pickup_scheduled", "picked_up", "processing", "ready_for_delivery", "out_for_delivery", "delivered", "cancelled"]),
  from: z.string().min(1).max(40),
  note: z.string().trim().max(200).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const code = (await params).code.toUpperCase();
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonError("Choose a valid status.", 400, "validation");
  const { to, from } = parsed.data;
  const note = parsed.data.note || null;
  if (to === "cancelled" && !note) return jsonError("Add a reason — the customer sees it.", 400, "validation");

  return handle("order status", async () => {
    const order = await findOrder(code);
    if (!order) return jsonError("Order not found.", 404, "not_found");
    if (order.status !== from) return jsonError("The order changed meanwhile. Refresh and try again.", 409, "conflict");
    if (order.status === to) return jsonError("The order already has that status.", 400, "validation");
    if (!(await setOrderStatus(order, to, note))) return jsonError("The order changed meanwhile. Refresh and try again.", 409, "conflict");

    logActivity({
      actorType: "admin", actorId: auth.admin.email, actorLabel: adminLabel(auth.admin),
      action: "order.status_override", entityType: "order", entityId: code,
      summary: `Admin changed ${code} from ${from.replace(/_/g, " ")} to ${to.replace(/_/g, " ")}${note ? ` (${note})` : ""}`,
      details: { from, to, note },
    });
    return Response.json({ order: await findOrder(code) });
  });
}
