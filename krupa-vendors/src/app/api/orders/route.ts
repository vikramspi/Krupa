import { guardDatabase, jsonError, requireVendor } from "@/server/http";
import { countVendorOrders, listVendorOrders, type OrderTab } from "@/server/repositories/orders";
import { ServiceError } from "@/types";

/** GET /api/orders?tab=new|active|done — the signed-in partner's orders, plus tab counts. */
export async function GET(request: Request) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;
  const auth = await requireVendor();
  if (auth.response) return auth.response;

  const tabParam = new URL(request.url).searchParams.get("tab");
  const tab: OrderTab = tabParam === "active" || tabParam === "done" ? tabParam : "new";
  try {
    const [orders, counts] = await Promise.all([listVendorOrders(auth.user.vendor.id, tab), countVendorOrders(auth.user.vendor.id)]);
    return Response.json({ orders, counts });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[orders] partner list failed", error);
    return jsonError("We couldn't load your orders.", 500, "server_error");
  }
}
