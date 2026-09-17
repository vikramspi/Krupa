import { handle, jsonError, requireAdmin } from "@/server/http";
import { listActivity } from "@/server/repositories/activity";
import { findOrder } from "@/server/repositories/orders";

/** GET /api/admin/orders/{code} — full order, its review, and its activity. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const code = (await params).code.toUpperCase();
  if (!/^KR-\d{5,8}$/.test(code)) return jsonError("Order not found.", 404, "not_found");
  return handle("order", async () => {
    const order = await findOrder(code);
    if (!order) return jsonError("Order not found.", 404, "not_found");
    const activity = await listActivity({ limit: 50, entity: { type: "order", id: code } });
    return Response.json({ order, activity });
  });
}
