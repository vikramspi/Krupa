import type { Metadata } from "next";
import { Suspense } from "react";
import { PartnerLoginForm } from "@/components/auth/PartnerLoginForm";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoadingState } from "@/components/ui/LoadingState";
import { widgetClientConfig } from "@/server/msg91Widget";

export const metadata: Metadata = { title: "Log in" };
// Reads MSG91 settings at request time.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <AuthFrame>
      <Suspense fallback={<LoadingState />}>
        <PartnerLoginForm smsWidgetConfig={widgetClientConfig()} />
      </Suspense>
    </AuthFrame>
  );
}
