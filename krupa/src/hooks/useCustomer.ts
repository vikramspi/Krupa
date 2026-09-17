"use client";

import { useSession } from "@/state/SessionProvider";
import type { Customer } from "@/types";

export interface CustomerState {
  data: Customer | undefined;
  status: "idle" | "loading" | "success" | "error";
  error: string | null;
  reload: () => void;
  setData: (customer: Customer) => void;
  /** False until the session lookup has settled. */
  sessionReady: boolean;
  isSignedIn: boolean;
  customerId: string | null;
}

/** The signed-in customer's profile, or nothing when signed out. */
export function useCustomer(): CustomerState {
  const session = useSession();
  return {
    data: session.customer ?? undefined,
    status: session.status,
    error: session.error,
    reload: session.refresh,
    setData: session.setCustomer,
    sessionReady: session.status !== "loading",
    isSignedIn: !!session.customer,
    customerId: session.customer?.id ?? null,
  };
}
