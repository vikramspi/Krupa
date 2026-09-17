import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <AuthFrame>
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
