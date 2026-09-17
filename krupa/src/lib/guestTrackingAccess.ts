"use client";

/**
 * Remembers, for this browser tab only, which order a guest has already unlocked
 * with its mobile number — so the lookup form and the tracking page don't ask twice.
 * sessionStorage: gone when the tab closes, never sent to the server.
 */
const KEY = "krupa:tracking-access";

export function rememberGuestAccess(orderId: string, phone: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ orderId, phone }));
  } catch {
    // Storage blocked: the tracking page simply asks for the number again.
  }
}

export function recallGuestAccess(orderId: string): string | null {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as { orderId?: string; phone?: string } | null;
    return saved?.orderId === orderId && typeof saved.phone === "string" ? saved.phone : null;
  } catch {
    return null;
  }
}
