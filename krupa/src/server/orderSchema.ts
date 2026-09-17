import { z } from "zod";
import { MAX_ITEM_QUANTITY } from "@/lib/limits";

/**
 * Schema for an incoming order request. Everything crossing the network is
 * untrusted: the server re-derives names, prices and totals from item IDs and
 * only uses the client's numbers to detect tampering.
 */
export const orderRequestSchema = z.object({
  vendorId: z.string().min(1).max(64),
  contact: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().trim().min(10).max(16),
    email: z.union([z.email().max(160), z.literal("")]).optional(),
  }),
  address: z.object({
    line1: z.string().trim().min(3).max(120),
    line2: z.string().trim().min(3).max(120),
    landmark: z.string().trim().max(120).optional(),
    areaId: z.string().min(1).max(64),
    areaName: z.string().min(1).max(80),
    pincode: z.string().regex(/^[1-9]\d{5}$/),
    city: z.string().min(1).max(60),
  }),
  pickup: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slotId: z.string().min(1).max(32),
  }),
  lines: z
    .array(
      z.object({
        itemId: z.string().min(1).max(64),
        quantity: z.number().int().min(1).max(MAX_ITEM_QUANTITY),
      }),
    )
    .min(1)
    .max(30),
  instructions: z.string().trim().max(240).optional(),
  customerId: z.string().max(64).nullable().optional(),
  /** Bot honeypot — real customers never see this field, so it must be empty. */
  website: z.string().max(0).optional(),
  /** What the browser displayed. Compared against the server total, never trusted. */
  clientTotal: z.number().nonnegative().optional(),
});

export type OrderRequest = z.infer<typeof orderRequestSchema>;
