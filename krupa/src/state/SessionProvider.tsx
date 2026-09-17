"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAsync, type AsyncStatus } from "@/hooks/useAsync";
import { customerService } from "@/services";
import type { Customer } from "@/types";

/**
 * The signed-in customer, read once from the session cookie via /api/auth/session
 * and shared across the app. The browser stores no identity of its own — the
 * httpOnly cookie is the only credential.
 */
interface SessionValue {
  customer: Customer | null;
  status: AsyncStatus;
  error: string | null;
  refresh: () => void;
  setCustomer: (customer: Customer | null) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useAsync(() => customerService.getSession(), "session");
  const { status, error, reload, setData } = session;
  const customer = session.data ?? session.staleData ?? null;

  const value = useMemo<SessionValue>(
    () => ({
      customer: status === "loading" ? null : customer,
      status,
      error,
      refresh: reload,
      setCustomer: setData,
      signOut: async () => {
        await customerService.signOut();
        setData(null);
      },
    }),
    [customer, status, error, reload, setData],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
