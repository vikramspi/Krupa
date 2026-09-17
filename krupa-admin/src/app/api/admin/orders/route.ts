import { handle, requireAdmin } from "@/server/http";
import { listOrders } from "@/server/repositories/orders";
import type { OrderStatus } from "@/types";

const STATUSES = ["placed", "vendor_assigned", "pickup_scheduled", "picked_up", "processing", "ready_for_delivery", "out_for_delivery", "delivered", "cancelled", "open"];
const UUID = /^[0-9a-f-]{36}$/i;

/** GET /api/admin/orders?status=&vendor=&customer=&q=&page= */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const p = new URL(request.url).searchParams;
  const status = p.get("status");
  const vendor = p.get("vendor");
  const customer = p.get("customer");
  const page = Math.max(1, Math.min(1000, Number(p.get("page")) || 1));
  return handle("orders", async () =>
    Response.json(
      await listOrders({
        status: status && STATUSES.includes(status) ? (status as OrderStatus | "open") : undefined,
        vendorId: vendor && UUID.test(vendor) ? vendor : undefined,
        customerId: customer && UUID.test(customer) ? customer : undefined,
        search: p.get("q")?.slice(0, 60) || undefined,
        page,
      }),
    ),
  );
}
