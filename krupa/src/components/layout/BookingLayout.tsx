"use client";

import { Headset, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";
import { ProgressIndicator } from "@/components/ui/ProgressIndicator";
import { trackBookingStep, type BookingStep } from "@/lib/analytics";
import { siteConfig } from "@/lib/config";
import { formatPhone } from "@/lib/format";
import { useBookingStore } from "@/state/bookingStore";
import { PROGRESS_STEPS, ROUTE_TO_PROGRESS, isProgressStepReachable, type BookingRouteStep } from "@/state/bookingSteps";
import { useStoresHydrated } from "@/state/hydration";

function routeStepFromPath(pathname: string): BookingRouteStep | null {
  const segment = pathname.split("/")[2] as BookingRouteStep | undefined;
  return segment && segment in ROUTE_TO_PROGRESS ? segment : null;
}

/** Focused checkout-style shell shared by every /book/* step. */
export function BookingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hydrated = useStoresHydrated();
  const routeStep = routeStepFromPath(pathname);
  const bookingState = useBookingStore();

  // One funnel event per step, so drop-off is visible in GA4 / Meta.
  useEffect(() => {
    if (routeStep) trackBookingStep(routeStep === "vendors" ? "vendor" : routeStep === "schedule" ? "pickup" : (routeStep as BookingStep));
  }, [routeStep]);

  const steps = PROGRESS_STEPS.map((step) => ({
    ...step,
    reachable: hydrated && isProgressStepReachable(step.id, bookingState),
  }));

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-md">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-1">
            <a
              href={`tel:+91${siteConfig.supportPhone}`}
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-ink-600 hover:bg-ink-100 hover:text-ink-900 sm:inline-flex"
            >
              <Headset className="size-4" aria-hidden="true" />
              Need help? {formatPhone(siteConfig.supportPhone)}
            </a>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-100 hover:text-ink-900"
            >
              <X className="size-4" aria-hidden="true" />
              <span>
                Exit<span className="sr-only"> booking (your progress is saved)</span>
              </span>
            </Link>
          </div>
        </Container>
        {routeStep && (
          <Container className="pb-3.5 pt-0.5">
            <ProgressIndicator steps={steps} currentId={ROUTE_TO_PROGRESS[routeStep]} />
          </Container>
        )}
      </header>
      <main id="main" className="flex-1 pb-28 pt-6 sm:pt-10 lg:pb-16">
        {children}
      </main>
    </div>
  );
}

export function BookingPage({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <Container size={wide ? "default" : "narrow"}>{children}</Container>;
}
