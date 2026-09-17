/** Service ids a vendor can offer — mirrors the customer site's catalogue (src/data/catalog.ts there). */
export const SERVICE_OFFERINGS = [
  { id: "wash-fold", name: "Wash & Fold" },
  { id: "wash-iron", name: "Wash & Iron" },
  { id: "ironing", name: "Ironing" },
  { id: "dry-cleaning", name: "Dry Cleaning" },
  { id: "premium", name: "Premium Garments" },
  { id: "bedsheets", name: "Bedsheets & Linen" },
  { id: "blankets", name: "Blankets & Quilts" },
  { id: "shoes", name: "Shoe Cleaning" },
] as const;

export type ServiceOfferingId = (typeof SERVICE_OFFERINGS)[number]["id"];
export const SERVICE_IDS = SERVICE_OFFERINGS.map((s) => s.id) as ServiceOfferingId[];
