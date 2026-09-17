import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { SetPasswordForm } from "@/components/auth/SetPasswordForm";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = { title: "Set your password" };

export default function SetPasswordPage() {
  return (
    <AuthFrame>
      <Suspense fallback={<LoadingState />}>
        <SetPasswordForm />
      </Suspense>
    </AuthFrame>
  );
}
