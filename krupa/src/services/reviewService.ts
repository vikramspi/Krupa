/**
 * reviewService — platform testimonials.
 *
 * Future API:
 *   getFeaturedReviews() → GET /reviews/featured
 *
 * (Vendor-specific reviews come embedded in `vendorService.getVendorById`.)
 */
import { platformReviews } from "@/data/reviews";
import type { PlatformReview } from "@/types";

export const reviewService = {
  async getFeaturedReviews(): Promise<PlatformReview[]> {
    return structuredClone(platformReviews);
  },
};
