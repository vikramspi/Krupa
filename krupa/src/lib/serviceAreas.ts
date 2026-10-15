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
  const namedArea = serviceAreas.find((area) => normalise(area.name) === q || normalise(area.id) === q);
  if (namedArea) return namedArea;
  const alias = serviceAreas.flatMap((area) => (area.aliases ?? []).map((name) => ({ area, name })))
    .find(({ name }) => normalise(name) === q);
  if (alias) return { ...alias.area, name: alias.name };
  return (
    serviceAreas.find((area) => q.includes(normalise(area.name))) ??
    serviceAreas.find((area) => normalise(area.name).startsWith(q) && q.length >= 3)
  );
}

export function pincodeFromText(query: string): string | undefined {
  return query.match(/\b([1-9]\d{5})\b/)?.[1];
}

export function searchServiceAreas(query: string): ServiceArea[] {
  const q = normalise(query);
  if (!q) return [];
  const candidates = serviceAreas.flatMap((area) => [
    area,
    ...(area.aliases ?? []).map((name) => ({ ...area, name })),
  ]);
  return candidates
    .filter((area) => normalise(area.name).includes(q) || area.pincodes.some((p) => p.startsWith(query.trim())))
    .sort((a, b) => {
      const rank = (x: ServiceArea) => (normalise(x.name).startsWith(q) ? 0 : 1) + (x.coverage === "supported" ? 0 : 2);
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    })
    .filter((area, index, areas) => areas.findIndex((candidate) => candidate.id === area.id && candidate.name === area.name) === index)
    .slice(0, 6);
}

/** Exact imported locality labels that should be used to filter a broad area's vendors. */
export function vendorCoverageNames(areaId: string, areaName: string): string[] | null {
  const area = serviceAreas.find((item) => item.id === areaId);
  if (!area) return null;
  const alias = area.aliases?.find((name) => normalise(name) === normalise(areaName));
  if (alias) return [alias];
  return area.coverageNames ?? null;
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
