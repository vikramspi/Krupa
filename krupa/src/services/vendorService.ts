/**
 * vendorService — partner discovery, details and pickup availability.
 *
 * Everything comes from the `vendors` table through server-side route handlers:
 *   getNearbyVendors(location)       → GET /api/vendors/nearby?areaId=&lat=&lng=
 *   getVendorById(vendorId)          → GET /api/vendors/{id}
 *   getPickupSlots(vendorId, date)   → GET /api/vendors/{id}/pickup-slots?date=
 *   getVendorReviews(vendorId, from) → GET /api/vendors/{id}/reviews?offset=
 */
import type { BookingLocation, PickupSlot, Vendor, VendorMatchResult, VendorReviewPage } from "@/types";
import { apiRequest } from "./apiClient";

export const vendorService = {
  async getNearbyVendors(location: Pick<BookingLocation, "areaId" | "areaName" | "coordinates">): Promise<VendorMatchResult> {
    const params = new URLSearchParams({ areaId: location.areaId });
    if (location.coordinates) {
      params.set("lat", String(location.coordinates.lat));
      params.set("lng", String(location.coordinates.lng));
    }
    const { vendors, evaluatedCount } = await apiRequest<Omit<VendorMatchResult, "areaName">>(
      `/api/vendors/nearby?${params}`,
    );
    return { areaName: location.areaName, vendors, evaluatedCount };
  },

  async getVendorById(vendorId: string): Promise<Vendor> {
    const { vendor } = await apiRequest<{ vendor: Vendor }>(`/api/vendors/${encodeURIComponent(vendorId)}`);
    return vendor;
  },

  async getPickupSlots(vendorId: string, dateKey: string): Promise<PickupSlot[]> {
    const { slots } = await apiRequest<{ slots: PickupSlot[] }>(
      `/api/vendors/${encodeURIComponent(vendorId)}/pickup-slots?date=${encodeURIComponent(dateKey)}`,
    );
    return slots;
  },

  async getVendorReviews(vendorId: string, offset = 0): Promise<VendorReviewPage> {
    return apiRequest<VendorReviewPage>(`/api/vendors/${encodeURIComponent(vendorId)}/reviews?offset=${offset}`);
  },
};
