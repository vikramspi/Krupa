"use client";

import { ServiceError } from "@/types";

const ERROR_CODES = new Set(["not_found", "unavailable", "validation", "network", "unauthorised"]);
function toServiceErrorCode(code: unknown): ServiceError["code"] {
  return typeof code === "string" && ERROR_CODES.has(code) ? (code as ServiceError["code"]) : "network";
}

/**
 * Calls our own API routes. Every response the server sends is either the payload
 * or `{ error: { message, code } }`, so failures surface as `ServiceError` with a
 * message that is already safe to show a customer.
 */
export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ServiceError("We couldn't reach our servers. Check your connection and try again.", "network");
  }

  const payload = (await response.json().catch(() => null)) as (T & { error?: { message?: string; code?: string } }) | null;

  if (!response.ok) {
    throw new ServiceError(
      payload?.error?.message ?? "Something went wrong on our side. Please try again.",
      toServiceErrorCode(payload?.error?.code),
      payload?.error?.code,
    );
  }
  return payload as T;
}
