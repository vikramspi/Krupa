import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/account/LoginForm";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { isGoogleConfigured } from "@/server/google";
import { widgetClientConfig } from "@/server/msg91Widget";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false },
};

export default function LoginPage() {
  return (
    <Container size="tight" className="py-12 sm:py-20">
      <Suspense fallback={<LoadingState />}>
        <LoginForm googleEnabled={isGoogleConfigured()} smsWidgetConfig={widgetClientConfig()} />
      </Suspense>
    </Container>
  );
}
