import { popularAreaIds, serviceAreas } from "@/data/areas";
import type { ServiceArea, ServiceAreaCheckResult } from "@/types";

/**
 * Pure service-area matching, shared by the client (typeahead) and the server
 * (coverage check). Partner counts are added by the server from the vendors table.
 */
const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export function findArea(query: string): ServiceArea | undefined {
  const trimmed = query.trim();
  if (/^\d{6}$/.test(trimmed)) return serviceAreas.find((a) => a.pincodes.includes(trimmed));
  const q = normalise(trimmed);
  if (!q) return undefined;
  return (
    serviceAreas.find((a) => normalise(a.name) === q || normalise(a.id) === q) ??
    serviceAreas.find((a) => q.includes(normalise(a.name))) ??
    serviceAreas.find((a) => normalise(a.name).startsWith(q) && q.length >= 3)
  );
}

export function pincodeFromText(query: string): string | undefined {
  return query.match(/\b([1-9]\d{5})\b/)?.[1];
}

export function searchServiceAreas(query: string): ServiceArea[] {
  const q = normalise(query);
  if (!q) return [];
  return serviceAreas
    .filter((a) => normalise(a.name).includes(q) || a.pincodes.some((p) => p.startsWith(query.trim())))
    .sort((a, b) => {
      const rank = (x: ServiceArea) => (normalise(x.name).startsWith(q) ? 0 : 1) + (x.coverage === "supported" ? 0 : 2);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    })
    .slice(0, 6);
}

/** Coverage only — `partnerCount` is filled in by the caller that can query vendors. */
export function checkAreaCoverage(query: string): ServiceAreaCheckResult {
  const trimmed = query.trim();
  const pincode = pincodeFromText(trimmed);
  const area = (pincode && findArea(pincode)) || findArea(trimmed);

  if (area?.coverage === "supported") return { status: "supported", area, partnerCount: 0, hasPartners: false };
  if (area?.coverage === "coming_soon") {
    return { status: "coming_soon", query: trimmed, area, reason: area.city === "Mumbai" ? "area_not_covered" : "outside_city" };
  }
  if (pincode) {
    const n = Number(pincode);
    const inMumbai = n >= 400001 && n <= 400107;
    return { status: "coming_soon", query: pincode, reason: inMumbai ? "area_not_covered" : "outside_city" };
  }
  return {
    status: "not_found",
    query: trimmed,
    suggestions: serviceAreas.filter((a) => popularAreaIds.includes(a.id)).slice(0, 4),
  };
}
