export interface Coordinates {
  lat: number;
  lng: number;
}

/** "supported" areas have partner coverage; "coming_soon" areas are on the roadmap. */
export type AreaCoverage = "supported" | "coming_soon";

export interface ServiceArea {
  id: string;
  name: string;
  /** Broader zone used for grouping, e.g. "Western Suburbs". */
  zone: string;
  city: string;
  pincodes: string[];
  coordinates: Coordinates;
  coverage: AreaCoverage;
}

export type LocationSource = "search" | "saved" | "current";

/** The location the customer chose at the start of the booking flow. */
export interface BookingLocation {
  areaId: string;
  areaName: string;
  pincode: string;
  city: string;
  coordinates: Coordinates;
  source: LocationSource;
  /** Present when the customer picked a saved address or used current location. */
  addressLine?: string;
  savedAddressId?: string;
}

export type ServiceAreaCheckResult =
  | {
      status: "supported";
      area: ServiceArea;
      /** Partners taking orders right now. */
      partnerCount: number;
      /** Whether any partner covers the area at all (false: nobody yet; true with 0 active: fully booked). */
      hasPartners: boolean;
    }
  | { status: "coming_soon"; query: string; area?: ServiceArea; reason: "area_not_covered" | "outside_city" }
  | { status: "not_found"; query: string; suggestions: ServiceArea[] };
