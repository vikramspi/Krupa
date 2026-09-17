/**
 * Site-wide configuration.
 *
 * Anything prefixed NEXT_PUBLIC_ is inlined into the client bundle at build time —
 * never put a secret behind that prefix. Server-only secrets (Airtable, webhooks,
 * OTP provider) are read in server code only; see .env.example.
 */
const fromEnv = (value: string | undefined, fallback: string) => (value?.trim() ? value.trim() : fallback);

export const siteConfig = {
  name: "Krupa Laundry",
  city: "Mumbai",
  /** Canonical origin — used for metadata, sitemap, robots and OG URLs. */
  url: fromEnv(process.env.NEXT_PUBLIC_SITE_URL, "http://localhost:3000"),
  supportPhone: fromEnv(process.env.NEXT_PUBLIC_SUPPORT_PHONE, "9000012300"),
  supportEmail: fromEnv(process.env.NEXT_PUBLIC_SUPPORT_EMAIL, "care@krupalaundry.in"),
  supportHours: "8 AM – 9 PM, every day",
  /** Registered entity + address for the legal pages. Empty until confirmed by the business. */
  legalEntity: fromEnv(process.env.NEXT_PUBLIC_LEGAL_ENTITY, ""),
  legalAddress: fromEnv(process.env.NEXT_PUBLIC_LEGAL_ADDRESS, ""),
} as const;

/** Values still carrying prototype defaults — surfaced on the legal pages until replaced. */
export const PLACEHOLDER_SUPPORT_PHONE = "9000012300";
export const PLACEHOLDER_SUPPORT_EMAIL = "care@krupalaundry.in";

/** Details the business must supply before the legal pages count as official. */
export function missingLegalDetails(): string[] {
  const missing: string[] = [];
  if (!siteConfig.legalEntity) missing.push("registered business / entity name");
  if (!siteConfig.legalAddress) missing.push("registered business address");
  if (siteConfig.supportPhone === PLACEHOLDER_SUPPORT_PHONE) missing.push("real support phone number");
  if (siteConfig.supportEmail === PLACEHOLDER_SUPPORT_EMAIL) missing.push("real support email address");
  return missing;
}

/** Date the legal copy was last reviewed. Bump when the policies change. */
export const LEGAL_LAST_UPDATED = "17 September 2026";

/**
 * Demo shortcuts — sample tracking orders, "simulate next status", demo login.
 * OFF unless explicitly switched on. Must never be enabled in the production environment.
 */
export const demoMode = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

/** Marketing + product analytics. Each script only loads when its ID is configured. */
export const analyticsConfig = {
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? "",
  metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "",
  googleAdsId: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "",
  googleAdsPurchaseLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL ?? "",
} as const;
