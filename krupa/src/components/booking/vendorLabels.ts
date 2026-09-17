import type { Vendor } from "@/types";

export function priceLevel(vendor: Pick<Vendor, "priceMultiplier">): { label: string; symbol: string } {
  if (vendor.priceMultiplier < 0.97) return { label: "Budget-friendly", symbol: "₹" };
  if (vendor.priceMultiplier <= 1.1) return { label: "Standard pricing", symbol: "₹₹" };
  return { label: "Premium pricing", symbol: "₹₹₹" };
}

export function turnaroundLabel(vendor: Pick<Vendor, "turnaroundHours">): string {
  return `${vendor.turnaroundHours.min}–${vendor.turnaroundHours.max} hrs`;
}
