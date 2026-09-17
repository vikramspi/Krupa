/**
 * serviceCatalog — what can be cleaned and what it costs.
 *
 * The catalogue itself is still local reference data (`src/data/catalog.ts`).
 * Vendor-specific pricing comes from the server, which reads the partner's
 * multiplier from the database:
 *   getServices(vendorId) → GET /api/vendors/{vendorId}/services
 */
import { catalogItems, serviceCategories, serviceOfferings } from "@/data/catalog";
import type { ServiceCategoryInfo, ServiceOffering, VendorCatalogItem } from "@/types";
import { apiRequest } from "./apiClient";

export const serviceCatalog = {
  async getServiceOfferings(): Promise<ServiceOffering[]> {
    return structuredClone(serviceOfferings);
  },

  async getCategories(): Promise<ServiceCategoryInfo[]> {
    return structuredClone(serviceCategories);
  },

  /** Base catalogue prices, or one partner's prices when a vendor id is given. */
  async getServices(vendorId?: string): Promise<VendorCatalogItem[]> {
    if (!vendorId) {
      return catalogItems.map((item) => ({ ...item, price: item.basePrice, available: true }));
    }
    const { items } = await apiRequest<{ items: VendorCatalogItem[] }>(
      `/api/vendors/${encodeURIComponent(vendorId)}/services`,
    );
    return items;
  },
};
