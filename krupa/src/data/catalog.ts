import type { CatalogItem, ServiceCategoryInfo, ServiceOffering } from "@/types";

/**
 * Single source of truth for what Krupa Laundry sells.
 * The landing page, services page and booking flow all read this via `serviceCatalog`.
 */
export const serviceOfferings: ServiceOffering[] = [
  {
    id: "wash-fold",
    name: "Wash & Fold",
    shortDescription: "Everyday wear, machine-washed and neatly folded.",
    description:
      "Your everyday clothes are sorted by colour and fabric, washed with gentle detergent, tumble-dried and folded so they go straight into your wardrobe.",
    icon: "wash-fold",
    startingPrice: 20,
    priceUnit: "piece",
    turnaround: "24–48 hrs",
    includes: ["Colour & fabric sorting", "Gentle, skin-safe detergent", "Folded & packed"],
  },
  {
    id: "wash-iron",
    name: "Wash & Iron",
    shortDescription: "Washed, steam-pressed and returned on hangers.",
    description:
      "Shirts, trousers and office wear are washed, steam-ironed and returned crisp — on hangers or neatly folded, as you prefer.",
    icon: "wash-iron",
    startingPrice: 30,
    priceUnit: "piece",
    turnaround: "24–48 hrs",
    includes: ["Wash + steam press", "Collar & cuff care", "Hanger or fold packing"],
  },
  {
    id: "ironing",
    name: "Ironing",
    shortDescription: "Crisp steam press for clothes that are already clean.",
    description: "Already washed at home? Send it over for a professional steam press, returned the next day.",
    icon: "ironing",
    startingPrice: 15,
    priceUnit: "piece",
    turnaround: "12–24 hrs",
    includes: ["Steam press", "Crease-free finish", "Next-day return"],
  },
  {
    id: "dry-cleaning",
    name: "Dry Cleaning",
    shortDescription: "Solvent cleaning for suits, blazers and delicates.",
    description:
      "Structured garments and delicate fabrics are spot-treated and dry cleaned to keep their shape, colour and finish intact.",
    icon: "dry-cleaning",
    startingPrice: 120,
    priceUnit: "piece",
    turnaround: "48–72 hrs",
    includes: ["Stain pre-treatment", "Shape-safe cleaning", "Garment covers"],
  },
  {
    id: "premium",
    name: "Premium Garments",
    shortDescription: "Silk sarees, sherwanis, lehengas and leather.",
    description:
      "Hand-finished care for occasion wear and luxury fabrics, handled by specialists and inspected before it comes home.",
    icon: "premium",
    startingPrice: 220,
    priceUnit: "piece",
    turnaround: "72–96 hrs",
    includes: ["Hand-finishing", "Embellishment protection", "Quality inspection"],
  },
  {
    id: "bedsheets",
    name: "Bedsheets & Linen",
    shortDescription: "Bedsheets, pillow covers, towels and curtains.",
    description: "Hygienic hot-wash for home linen, with a soft finish and neat folding.",
    icon: "bedsheet",
    startingPrice: 20,
    priceUnit: "piece",
    turnaround: "24–48 hrs",
    includes: ["Hygienic hot wash", "Softener finish", "Folded in sets"],
  },
  {
    id: "blankets",
    name: "Blankets & Quilts",
    shortDescription: "Deep cleaning for blankets, quilts and comforters.",
    description: "Heavy bedding is deep-cleaned in large-drum machines and fully dried so it comes back fresh, never damp.",
    icon: "blanket",
    startingPrice: 180,
    priceUnit: "piece",
    turnaround: "48–72 hrs",
    includes: ["Large-drum wash", "Full drying cycle", "Vacuum-sealed packing"],
  },
  {
    id: "shoes",
    name: "Shoe Cleaning",
    shortDescription: "Sneakers and casual shoes, cleaned and deodorised.",
    description: "Sneakers and canvas shoes are hand-cleaned, whitened where needed and deodorised.",
    icon: "shoes",
    startingPrice: 300,
    priceUnit: "pair",
    turnaround: "72–96 hrs",
    includes: ["Hand cleaning", "Sole whitening", "Deodorising"],
  },
];

export const serviceCategories: ServiceCategoryInfo[] = [
  { id: "everyday", label: "Everyday Laundry", description: "Shirts, tees, trousers and daily wear" },
  { id: "household", label: "Household", description: "Bedsheets, blankets, towels and linen" },
  { id: "specialty", label: "Specialty", description: "Suits, sarees, jackets and shoes" },
];

export const catalogItems: CatalogItem[] = [
  // Everyday
  { id: "shirt", name: "Shirt", category: "everyday", offeringId: "wash-iron", basePrice: 30, unit: "piece" },
  { id: "tshirt", name: "T-shirt", category: "everyday", offeringId: "wash-fold", basePrice: 25, unit: "piece" },
  { id: "trousers", name: "Trousers / pants", category: "everyday", offeringId: "wash-iron", basePrice: 35, unit: "piece" },
  { id: "jeans", name: "Jeans", category: "everyday", offeringId: "wash-fold", basePrice: 40, unit: "piece" },
  { id: "dress", name: "Dress", category: "everyday", offeringId: "wash-iron", basePrice: 60, unit: "piece" },
  { id: "kurta", name: "Kurta", category: "everyday", offeringId: "wash-iron", basePrice: 40, unit: "piece" },
  { id: "shorts", name: "Shorts", category: "everyday", offeringId: "wash-fold", basePrice: 20, unit: "piece" },
  { id: "nightwear", name: "Nightwear set", category: "everyday", offeringId: "wash-fold", basePrice: 45, unit: "set" },
  { id: "press-only", name: "Steam press only", category: "everyday", offeringId: "ironing", basePrice: 15, unit: "piece", note: "For clothes already washed" },

  // Household
  { id: "bedsheet-single", name: "Bedsheet (single)", category: "household", offeringId: "bedsheets", basePrice: 60, unit: "piece" },
  { id: "bedsheet-double", name: "Bedsheet (double)", category: "household", offeringId: "bedsheets", basePrice: 80, unit: "piece" },
  { id: "pillow-cover", name: "Pillow cover", category: "household", offeringId: "bedsheets", basePrice: 20, unit: "piece" },
  { id: "towel", name: "Bath towel", category: "household", offeringId: "bedsheets", basePrice: 25, unit: "piece" },
  { id: "curtain", name: "Curtain panel", category: "household", offeringId: "bedsheets", basePrice: 90, unit: "piece" },
  { id: "blanket-single", name: "Blanket (single)", category: "household", offeringId: "blankets", basePrice: 180, unit: "piece" },
  { id: "blanket-double", name: "Blanket / quilt (double)", category: "household", offeringId: "blankets", basePrice: 250, unit: "piece" },

  // Specialty
  { id: "suit", name: "Suit (2-piece)", category: "specialty", offeringId: "dry-cleaning", basePrice: 250, unit: "set" },
  { id: "blazer", name: "Blazer / jacket", category: "specialty", offeringId: "dry-cleaning", basePrice: 180, unit: "piece" },
  { id: "saree-cotton", name: "Saree (cotton)", category: "specialty", offeringId: "dry-cleaning", basePrice: 120, unit: "piece", note: "Includes starch on request" },
  { id: "saree-silk", name: "Saree (silk)", category: "specialty", offeringId: "premium", basePrice: 220, unit: "piece" },
  { id: "sherwani", name: "Sherwani", category: "specialty", offeringId: "premium", basePrice: 350, unit: "piece" },
  { id: "lehenga", name: "Lehenga", category: "specialty", offeringId: "premium", basePrice: 450, unit: "set" },
  { id: "leather-jacket", name: "Leather jacket", category: "specialty", offeringId: "premium", basePrice: 450, unit: "piece" },
  { id: "shoes", name: "Sneakers / shoes", category: "specialty", offeringId: "shoes", basePrice: 300, unit: "pair" },
];
