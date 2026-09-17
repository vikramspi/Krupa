import { handle, requireAdmin } from "@/server/http";
import { listReviews } from "@/server/repositories/reviews";

/** GET /api/admin/reviews?vendor=&hidden=1&page= */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const p = new URL(request.url).searchParams;
  const vendor = p.get("vendor");
  const page = Math.max(1, Math.min(1000, Number(p.get("page")) || 1));
  return handle("reviews", async () =>
    Response.json(
      await listReviews({ vendorId: vendor && /^[0-9a-f-]{36}$/i.test(vendor) ? vendor : undefined, hiddenOnly: p.get("hidden") === "1", page }),
    ),
  );
}
