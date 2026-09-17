/**
 * Icon keys are plain strings so the data layer stays serialisable (and could
 * come straight from an API). Components map them to real icons.
 */
export type IconKey =
  | "wash-fold"
  | "wash-iron"
  | "ironing"
  | "dry-cleaning"
  | "premium"
  | "bedsheet"
  | "blanket"
  | "shoes"
  | "shirt"
  | "household"
  | "towel";

export type ServiceOfferingId =
  | "wash-fold"
  | "wash-iron"
  | "ironing"
  | "dry-cleaning"
  | "premium"
  | "bedsheets"
  | "blankets"
  | "shoes";

/** A high-level service Krupa Laundry sells (shown on the landing & services pages). */
export interface ServiceOffering {
  id: ServiceOfferingId;
  name: string;
  shortDescription: string;
  description: string;
  icon: IconKey;
  startingPrice: number;
  priceUnit: string;
  turnaround: string;
  includes: string[];
}

export type ServiceCategory = "everyday" | "household" | "specialty";

export interface ServiceCategoryInfo {
  id: ServiceCategory;
  label: string;
  description: string;
}

export type PriceUnit = "piece" | "pair" | "set";

/** A single garment/item a customer can add to an order, at the platform base price. */
export interface CatalogItem {
  id: string;
  name: string;
  category: ServiceCategory;
  /** Which offering a vendor must provide to handle this item. */
  offeringId: ServiceOfferingId;
  basePrice: number;
  unit: PriceUnit;
  note?: string;
}

/** A catalog item priced for (and checked against) a specific vendor. */
export interface VendorCatalogItem extends CatalogItem {
  price: number;
  available: boolean;
}
