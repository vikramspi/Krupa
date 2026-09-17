"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/apiClient";
import type { VendorSessionUser } from "@/types";

interface SessionState {
  status: "loading" | "ready";
  user: VendorSessionUser | null;
  setUser: (user: VendorSessionUser | null) => void;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [user, setUser] = useState<VendorSessionUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    apiRequest<{ user: VendorSessionUser | null }>("/api/auth/session")
      .then((res) => !cancelled && setUser(res.user))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setStatus("ready"));
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await apiRequest("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    setUser(null);
    router.replace("/login");
  }, [router]);

  return <SessionContext.Provider value={{ status, user, setUser, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
