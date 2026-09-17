import { z } from "zod";
import { guardDatabase, jsonError } from "@/server/http";
import { listVendorReviews } from "@/server/repositories/reviews";
import { ServiceError } from "@/types";

/** GET /api/vendors/{id}/reviews?offset=0 — a partner's published reviews, newest first. Public. */
const PAGE_SIZE = 5;
const querySchema = z.object({ id: z.uuid(), offset: z.coerce.number().int().min(0).max(10_000).default(0) });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unavailable = guardDatabase();
  if (unavailable) return unavailable;

  const parsed = querySchema.safeParse({
    id: (await params).id,
    offset: new URL(request.url).searchParams.get("offset") ?? undefined,
  });
  if (!parsed.success) return jsonError("That laundry partner doesn't exist.", 404, "not_found");

  try {
    return Response.json(await listVendorReviews(parsed.data.id, parsed.data.offset, PAGE_SIZE));
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[reviews] list failed", error);
    return jsonError("We couldn't load reviews.", 500, "server_error");
  }
}
