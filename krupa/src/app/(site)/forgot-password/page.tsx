import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/account/ForgotPasswordForm";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Request a password reset link for your Krupa Laundry account.",
  robots: { index: false },
};

export default function Page() {
  return (
    <Container size="tight" className="py-12 sm:py-20">
      <Suspense fallback={<LoadingState />}>
        <ForgotPasswordForm />
      </Suspense>
    </Container>
  );
}
