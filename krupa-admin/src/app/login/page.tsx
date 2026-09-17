import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLogin } from "@/components/admin/AdminLogin";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center bg-ink-950 px-4">
      <Suspense>
        <AdminLogin />
      </Suspense>
    </main>
  );
}
