import { FinalCTA } from "@/components/marketing/FinalCTA";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ReviewsCarousel } from "@/components/marketing/ReviewsCarousel";
import { ServiceAreaChecker } from "@/components/marketing/ServiceAreaChecker";
import { ServicesGrid } from "@/components/marketing/ServicesGrid";
import { WhyKrupa } from "@/components/marketing/WhyKrupa";
import { serviceAreas } from "@/data/areas";
import { siteConfig } from "@/lib/config";
import { isDatabaseConfigured } from "@/server/env";
import { getNetworkStats } from "@/server/repositories/vendors";
import { locationService, reviewService, serviceCatalog } from "@/services";
import type { NetworkStats } from "@/types";

// Partner count and rating come from the database: refresh the prerendered page every 5 minutes.
export const revalidate = 300;

export default async function HomePage() {
  const [offerings, reviews, popularAreas] = await Promise.all([
    serviceCatalog.getServiceOfferings(),
    reviewService.getFeaturedReviews(),
    locationService.getPopularAreas(),
  ]);

  // The marketing page must render even if the database is unreachable.
  const areasServed = serviceAreas.filter((area) => area.coverage === "supported").length;
  let stats: NetworkStats = { partnerCount: 0, averageRating: null, areasServed };
  if (isDatabaseConfigured()) {
    try {
      const network = await getNetworkStats();
      stats = { ...network, areasServed };
    } catch (error) {
      console.error("[home] network stats unavailable", error);
    }
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteConfig.name,
    description: "Doorstep laundry pickup and delivery across Mumbai, handled by trusted local laundry partners.",
    url: siteConfig.url,
    telephone: `+91${siteConfig.supportPhone}`,
    email: siteConfig.supportEmail,
    priceRange: "₹₹",
    areaServed: { "@type": "City", name: "Mumbai" },
    // No aggregateRating: search engines require it to summarise genuine reviews shown on the page.
    makesOffer: offerings.map((offering) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: offering.name, description: offering.shortDescription },
      priceCurrency: "INR",
      price: offering.startingPrice,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Hero stats={stats} />
      <HowItWorks />
      <ServicesGrid offerings={offerings} />
      <WhyKrupa partnerCount={stats.partnerCount} />
      <ServiceAreaChecker popularAreas={popularAreas} />
      {reviews.length > 0 && <ReviewsCarousel reviews={reviews} />}
      <FinalCTA />
    </>
  );
}
