import { z } from "zod";

export const phoneField = z.string().trim().min(10).max(16);

export const otpRequestSchema = z.object({ phone: phoneField });

export const otpVerifySchema = z.object({
  phone: phoneField,
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  name: z.string().trim().min(2).max(80).optional(),
});

export const registerSchema = z.object({
  email: z.email().max(160),
  password: z.string().min(8).max(200),
  name: z.string().trim().min(2).max(80),
});

export const loginSchema = z.object({
  email: z.email().max(160),
  password: z.string().min(1).max(200),
});

export const forgotPasswordSchema = z.object({ email: z.email().max(160) });

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(500),
  password: z.string().min(8).max(200),
});

export const profileSchema = z.object({ name: z.string().trim().min(2).max(80) });

export const addressSchema = z.object({
  id: z.uuid().optional(),
  label: z.enum(["Home", "Work", "Other"]),
  line1: z.string().trim().min(3).max(120),
  line2: z.string().trim().min(3).max(120),
  landmark: z.string().trim().max(120).optional(),
  areaId: z.string().min(1).max(64),
  areaName: z.string().min(1).max(80),
  pincode: z.string().regex(/^[1-9]\d{5}$/),
  city: z.string().min(1).max(60),
});

export const orderLookupSchema = z.object({
  orderCode: z.string().trim().min(5).max(12),
  phone: phoneField,
});
