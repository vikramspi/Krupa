import type { Metadata } from "next";
import { Suspense } from "react";
import { SignupForm } from "@/components/account/SignupForm";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { isGoogleConfigured } from "@/server/google";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a Krupa Laundry account with Google or your email address.",
  robots: { index: false },
};

export default function Page() {
  return (
    <Container size="tight" className="py-12 sm:py-20">
      <Suspense fallback={<LoadingState />}>
        <SignupForm googleEnabled={isGoogleConfigured()} />
      </Suspense>
    </Container>
  );
}
