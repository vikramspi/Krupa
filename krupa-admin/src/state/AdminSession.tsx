"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest } from "@/lib/apiClient";

interface Admin {
  email: string;
  name: string | null;
}
interface State {
  status: "loading" | "ready";
  admin: Admin | null;
  signOut: () => Promise<void>;
}

const Ctx = createContext<State | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<State["status"]>("loading");
  const [admin, setAdmin] = useState<Admin | null>(null);
  const router = useRouter();

  useEffect(() => {
    apiRequest<{ admin: Admin | null }>("/api/auth/session")
      .then((res) => setAdmin(res.admin))
      .catch(() => setAdmin(null))
      .finally(() => setStatus("ready"));
  }, []);

  const signOut = useCallback(async () => {
    await apiRequest("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    setAdmin(null);
    router.replace("/login");
  }, [router]);

  return <Ctx.Provider value={{ status, admin, signOut }}>{children}</Ctx.Provider>;
}

export function useAdmin(): State {
  const value = useContext(Ctx);
  if (!value) throw new Error("useAdmin must be used inside AdminSessionProvider");
  return value;
}
