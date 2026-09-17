import { handle, jsonError, requireAdmin } from "@/server/http";
import { listActivity } from "@/server/repositories/activity";
import { findCustomer } from "@/server/repositories/customers";
import { listOrders } from "@/server/repositories/orders";

/** GET /api/admin/customers/{id} — profile, orders and activity. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Customer not found.", 404, "not_found");
  return handle("customer", async () => {
    const customer = await findCustomer(id);
    if (!customer) return jsonError("Customer not found.", 404, "not_found");
    const [orders, activity] = await Promise.all([
      listOrders({ customerId: id, page: 1 }),
      listActivity({ limit: 30, entity: { type: "customer", id } }),
    ]);
    return Response.json({ customer, orders: orders.orders, activity });
  });
}
