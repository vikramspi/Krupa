import type { PlatformReview } from "@/types";

/**
 * Customer reviews shown on the landing page.
 *
 * Only add GENUINE reviews from real customers, with their permission. Invented
 * testimonials mislead customers and break consumer-protection rules on fake
 * reviews. While this list is empty the reviews section is not shown at all.
 *
 * Example entry:
 *   { id: "r-1", author: "First name L.", area: "Bandra West", rating: 5, service: "Wash & Iron", text: "…" }
 */
export const platformReviews: PlatformReview[] = [];
