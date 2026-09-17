import "server-only";
import { catalogItems } from "@/data/catalog";
import { priceForVendor } from "@/lib/pricing";
import type { Vendor, VendorCatalogItem } from "@/types";

/** The full catalogue priced for one partner, with anything they don't offer marked unavailable. */
export function catalogForVendor(vendor: Vendor): VendorCatalogItem[] {
  return catalogItems.map((item) => ({
    ...item,
    price: priceForVendor(item, vendor),
    available: vendor.services.includes(item.offeringId),
  }));
}
