import { handle, requireAdmin } from "@/server/http";
import { listActivity } from "@/server/repositories/activity";
import { listOrders } from "@/server/repositories/orders";
import { getDashboardStats } from "@/server/repositories/stats";

/** GET /api/admin/stats — dashboard numbers, orders waiting on partners, latest activity. */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  return handle("stats", async () => {
    const [stats, waiting, activity] = await Promise.all([
      getDashboardStats(),
      listOrders({ status: "placed", page: 1 }),
      listActivity({ limit: 15 }),
    ]);
    return Response.json({ stats, waiting: waiting.orders.slice(0, 10), activity });
  });
}
