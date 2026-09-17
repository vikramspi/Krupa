/**
 * locationService — service-area coverage and area search.
 *
 *   checkServiceArea(query)   → GET  /api/service-areas/check?q={query}   (live partner count)
 *   searchAreas / getSupportedAreas / getPopularAreas / getAreaById
 *                             → the neighbourhood list in src/data/areas.ts
 *   resolveCurrentLocation()  → browser geolocation → nearest known neighbourhood
 *   joinWaitlist(input)       → POST /api/service-areas/waitlist (emails the operator)
 */
import { popularAreaIds, serviceAreas } from "@/data/areas";
import { roadDistanceKm } from "@/lib/geo";
import { searchServiceAreas } from "@/lib/serviceAreas";
import { isValidEmail, isValidIndianMobile } from "@/lib/validation";
import { apiRequest } from "./apiClient";
import { ServiceError, type BookingLocation, type ServiceArea, type ServiceAreaCheckResult } from "@/types";

/** Farther than this from every neighbourhood centre counts as outside our map. */
const MAX_AREA_MATCH_KM = 5;

export const locationService = {
  async checkServiceArea(query: string): Promise<ServiceAreaCheckResult> {
    const { result } = await apiRequest<{ result: ServiceAreaCheckResult }>(
      `/api/service-areas/check?q=${encodeURIComponent(query)}`,
    );
    return result;
  },

  /** Typeahead over the local area list — synchronous work, kept async for the call sites. */
  async searchAreas(query: string): Promise<ServiceArea[]> {
    return searchServiceAreas(query);
  },

  async getSupportedAreas(): Promise<ServiceArea[]> {
    return serviceAreas.filter((a) => a.coverage === "supported");
  },

  async getPopularAreas(): Promise<ServiceArea[]> {
    return popularAreaIds.map((id) => serviceAreas.find((a) => a.id === id)).filter((a): a is ServiceArea => !!a);
  },

  async getAreaById(areaId: string): Promise<ServiceArea> {
    const area = serviceAreas.find((a) => a.id === areaId);
    if (!area) throw new ServiceError("We couldn't find that area.", "not_found");
    return area;
  },

  /**
   * The browser's real location, matched to the nearest neighbourhood we know.
   * There's no reverse-geocoding provider, so no street address is filled in — the
   * customer types that at checkout. The exact coordinates are kept for matching
   * partners by distance.
   */
  async resolveCurrentLocation(): Promise<BookingLocation> {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      throw new ServiceError("Your browser can't share your location. Please enter your area instead.", "unavailable");
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 }),
    ).catch((error: GeolocationPositionError) => {
      throw new ServiceError(
        error.code === error.PERMISSION_DENIED
          ? "Location access is turned off for this site. Allow it in your browser, or enter your area instead."
          : "We couldn't detect your location. Please enter your area instead.",
        "unavailable",
      );
    });

    const here = { lat: position.coords.latitude, lng: position.coords.longitude };
    const nearest = serviceAreas
      .map((area) => ({ area, km: roadDistanceKm(here, area.coordinates) }))
      .sort((a, b) => a.km - b.km)[0];

    if (!nearest || nearest.km > MAX_AREA_MATCH_KM) {
      throw new ServiceError("You seem to be outside the areas we serve. Enter your area to check coverage.", "not_found");
    }
    if (nearest.area.coverage !== "supported") {
      throw new ServiceError(`We're not picking up in ${nearest.area.name} yet — we're adding partners there soon.`, "not_found");
    }

    return {
      areaId: nearest.area.id,
      areaName: nearest.area.name,
      pincode: nearest.area.pincodes[0],
      city: nearest.area.city,
      coordinates: here,
      source: "current",
    };
  },

  /** "Tell me when you launch here" — the operator gets an email for each request. */
  async joinWaitlist(input: { area: string; contact: string }): Promise<void> {
    const contact = input.contact.trim();
    if (!isValidEmail(contact) && !isValidIndianMobile(contact)) {
      throw new ServiceError("Enter a valid email address or 10-digit mobile number.", "validation");
    }
    await apiRequest("/api/service-areas/waitlist", { method: "POST", body: JSON.stringify({ area: input.area, contact }) });
  },

  /** Converts a service area into the booking-flow location shape. */
  toBookingLocation(area: ServiceArea, extra?: Partial<Pick<BookingLocation, "source" | "addressLine" | "savedAddressId" | "pincode">>): BookingLocation {
    return {
      areaId: area.id,
      areaName: area.name,
      pincode: extra?.pincode ?? area.pincodes[0],
      city: area.city,
      coordinates: area.coordinates,
      source: extra?.source ?? "search",
      addressLine: extra?.addressLine,
      savedAddressId: extra?.savedAddressId,
    };
  },
};
