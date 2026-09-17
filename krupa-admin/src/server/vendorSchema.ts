import "server-only";
import { z } from "zod";
import { serviceAreas } from "@/data/areas";
import { SERVICE_IDS } from "@/data/services";

const AREA_IDS = new Set(serviceAreas.map((a) => a.id));
const SERVICE_SET = new Set<string>(SERVICE_IDS);

/** Everything the admin can set on a vendor, validated server-side. */
export const vendorSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    contactPhone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a 10-digit Indian mobile number."),
    coverageAreas: z.array(z.string()).min(1, "Pick at least one area.").max(60).refine((ids) => ids.every((id) => AREA_IDS.has(id)), "Unknown area."),
    services: z.array(z.string()).min(1, "Pick at least one service.").refine((ids) => ids.every((id) => SERVICE_SET.has(id)), "Unknown service."),
    turnaround: z.object({ minHours: z.number().int().min(4).max(240), maxHours: z.number().int().min(4).max(336) }),
    rating: z.number().min(1).max(5).nullable(),
    isActive: z.boolean(),
    priceMultiplier: z.number().min(0.5).max(3),
    pickupFee: z.number().int().min(0).max(500),
    latitude: z.number().min(18.8).max(19.5).nullable(),
    longitude: z.number().min(72.7).max(73.3).nullable(),
    acceptsSameDay: z.boolean(),
  })
  .refine((v) => v.turnaround.maxHours >= v.turnaround.minHours, { message: "Max turnaround must be at least the minimum.", path: ["turnaround"] })
  .refine((v) => (v.latitude === null) === (v.longitude === null), { message: "Enter both latitude and longitude, or neither.", path: ["latitude"] })
  .transform((v) => ({ ...v, coverageAreas: [...new Set(v.coverageAreas)], services: [...new Set(v.services)] }));

export const vendorUserSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/).nullable(),
    email: z.email().max(160).nullable(),
  })
  .refine((v) => v.phone || v.email, { message: "Add a mobile number, an email, or both." });

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Some details are invalid.";
}
