"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Alert } from "@/components/ui/Alert";
import { LogoMark } from "@/components/ui/Logo";
import { useAdmin } from "@/state/AdminSession";

const ERRORS: Record<string, string> = {
  not_allowed: "That Google account isn't allowed to use the admin panel.",
  cancelled: "Sign-in was cancelled.",
  expired: "Sign-in timed out. Please try again.",
  failed: "Google sign-in failed. Please try again.",
  rate_limited: "Too many attempts. Please wait a few minutes.",
  unavailable: "Google sign-in isn't configured for the admin panel.",
};

export function AdminLogin() {
  const error = ERRORS[useSearchParams().get("error") ?? ""];
  const { status, admin } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" && admin) router.replace("/");
  }, [status, admin, router]);

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-raised">
      <LogoMark className="size-10 text-brand-600" />
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Krupa Laundry admin</h1>
      <p className="mt-1.5 text-[15px] text-ink-500">Operator access only. Sign in with your approved Google account.</p>
      {error && (
        <Alert tone="warning" title="Couldn't sign you in" className="mt-5" role="alert">
          {error}
        </Alert>
      )}
      <a
        href="/api/auth/google"
        className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink-950 px-5 text-[15px] font-semibold text-white hover:bg-ink-800"
      >
        <ShieldCheck className="size-5" aria-hidden="true" />
        Continue with Google
      </a>
    </div>
  );
}
