import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/account/ResetPasswordForm";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your Krupa Laundry account.",
  robots: { index: false },
};

export default function Page() {
  return (
    <Container size="tight" className="py-12 sm:py-20">
      <Suspense fallback={<LoadingState />}>
        <ResetPasswordForm />
      </Suspense>
    </Container>
  );
}
