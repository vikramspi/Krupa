import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config";

/** Public, indexable pages only — booking steps and order pages are per-customer. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${siteConfig.url}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/services`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteConfig.url}/book`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteConfig.url}/track`, lastModified, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteConfig.url}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteConfig.url}/cancellation-and-refunds`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
