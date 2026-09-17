import { handle, requireAdmin } from "@/server/http";
import { listCustomers } from "@/server/repositories/customers";

/** GET /api/admin/customers?q=&page= */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const p = new URL(request.url).searchParams;
  const page = Math.max(1, Math.min(1000, Number(p.get("page")) || 1));
  return handle("customers", async () => Response.json(await listCustomers(p.get("q")?.slice(0, 60) || undefined, page)));
}
