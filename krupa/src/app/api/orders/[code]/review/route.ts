import { logActivity } from "@/server/activity";
import { z } from "zod";
import { guardDatabase, jsonError, readJson, requireSession } from "@/server/http";
import { rateLimit } from "@/server/rateLimit";
import { findOrderReview, findReviewableOrder, saveOrderReview } from "@/server/repositories/reviews";
import { isValidOrderId, normalizeOrderId } from "@/lib/validation";
import { ServiceError } from "@/types";

/**
 * GET /api/orders/{code}/review — the customer's own review of this order, if any.
 * PUT /api/orders/{code}/review — create or update it.
 *
 * Only the customer who placed the order can review it, and only once it has been
 * delivered — so every published review comes from a real customer of that partner.
 */
const HOUR = 60 * 60 * 1000;

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .max(1000)
    .optional()
    .transform((value) => {
      // Strip control characters (keep newlines; emoji joiners are not controls), collapse blank lines.
      const cleaned = (value ?? "").replace(/[^\P{Cc}\n]/gu, "").replace(/\n{3,}/g, "\n\n").trim();
      return cleaned || null;
    }),
});

async function loadOrder(params: Promise<{ code: string }>) {
  const unavailable = guardDatabase();
  if (unavailable) return { response: unavailable } as const;

  const auth = await requireSession();
  if (auth.response) return { response: auth.response } as const;

  const { code } = await params;
  if (!isValidOrderId(code)) return { response: jsonError("That doesn't look like an order ID.", 400, "validation") } as const;

  const order = await findReviewableOrder(normalizeOrderId(code), auth.session.customerId);
  if (!order) return { response: jsonError("We couldn't find that order on your account.", 404, "not_found") } as const;
  return { order, customerId: auth.session.customerId } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const loaded = await loadOrder(params);
    if ("response" in loaded) return loaded.response;
    return Response.json({
      review: await findOrderReview(loaded.order.id),
      canReview: loaded.order.status === "delivered",
    });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, 503, error.code);
    console.error("[reviews] fetch failed", error);
    return jsonError("We couldn't load your review.", 500, "server_error");
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const loaded = await loadOrder(params);
    if ("response" in loaded) return loaded.response;

    const limit = rateLimit(`review:${loaded.customerId}`, 20, HOUR);
    if (!limit.ok) return jsonError("You've updated reviews a lot recently. Please try again later.", 429, "rate_limited");

    if (loaded.order.status !== "delivered") {
      return jsonError("You can review this partner once your order has been delivered.", 409, "unavailable");
    }

    const parsed = reviewSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonError("Choose a rating from 1 to 5 stars. Comments can be up to 1000 characters.", 400, "validation");
    }

    const review = await saveOrderReview(loaded.order, loaded.customerId, parsed.data);
    console.info("[reviews] saved", { vendor: loaded.order.vendorId, rating: review.rating });
    logActivity({
      actorType: "customer", actorId: loaded.customerId, action: "review.saved",
      entityType: "order", entityId: normalizeOrderId((await params).code),
      summary: `A customer rated their order ${review.rating}★`,
      details: { vendorId: loaded.order.vendorId, rating: review.rating, hasComment: Boolean(review.comment) },
    });
    return Response.json({ review });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, 503, error.code);
    }
    console.error("[reviews] save failed", error);
    return jsonError("We couldn't save your review. Please try again.", 500, "server_error");
  }
}
