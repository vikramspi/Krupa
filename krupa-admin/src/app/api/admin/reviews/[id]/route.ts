import { z } from "zod";
import { logActivity } from "@/server/activity";
import { adminLabel, handle, jsonError, readJson, requireAdmin } from "@/server/http";
import { setReviewPublished } from "@/server/repositories/reviews";

/** PATCH /api/admin/reviews/{id} — hide or re-publish a review. */
const schema = z.object({ isPublished: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (auth.response) return auth.response;
  const { id } = await params;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success || !/^[0-9a-f-]{36}$/i.test(id)) return jsonError("Invalid request.", 400, "validation");
  return handle("review moderation", async () => {
    const updated = await setReviewPublished(id, parsed.data.isPublished);
    if (!updated) return jsonError("Review not found.", 404, "not_found");
    logActivity({
      actorType: "admin", actorId: auth.admin.email, actorLabel: adminLabel(auth.admin),
      action: parsed.data.isPublished ? "review.published" : "review.hidden", entityType: "vendor", entityId: updated.vendorId,
      summary: `Admin ${parsed.data.isPublished ? "re-published" : "hid"} a review`,
      details: { reviewId: id },
    });
    return Response.json({ ok: true });
  });
}
