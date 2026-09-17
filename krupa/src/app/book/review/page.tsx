"use client";

import { ArrowRight, CalendarClock, ShieldCheck, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OrderReviewCard } from "@/components/booking/OrderReviewCard";
import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StepHeader } from "@/components/ui/StepHeader";
import { useBookingGuard } from "@/hooks/useBookingGuard";
import { useBookingSummary } from "@/hooks/useBookingSummary";
import { trackBeginCheckout } from "@/lib/analytics";
import { getErrorMessage, isServiceError } from "@/lib/errors";
import { formatINR } from "@/lib/format";
import { estimateDeliveryWindow } from "@/lib/schedule";
import { customerService, orderService } from "@/services";
import { useBookingStore } from "@/state/bookingStore";
import { useSession } from "@/state/SessionProvider";

export default function ReviewStepPage() {
  const [placed, setPlaced] = useState(false);
  const ready = useBookingGuard("review", { disabled: placed });
  if (!ready) return <LoadingState title="Loading your order…" />;
  return <ReviewStep onPlaced={() => setPlaced(true)} />;
}

function ReviewStep({ onPlaced }: { onPlaced: () => void }) {
  const router = useRouter();
  const summary = useBookingSummary();
  const details = useBookingStore((s) => s.details)!;
  const setLastPlacedOrder = useBookingStore((s) => s.setLastPlacedOrder);
  const customerId = useSession().customer?.id ?? null;

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<{ message: string; slotTaken: boolean } | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const { vendor, pickup, location, cart, pricing, turnaround } = summary;

  useEffect(() => {
    trackBeginCheckout(pricing.total, pricing.itemCount);
    // Reaching review is the conversion intent signal; fire it once per visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const deliveryWindow = pickup && turnaround ? estimateDeliveryWindow(pickup.date, pickup.slotId, turnaround) : null;

  const placeOrder = async () => {
    if (!vendor || !pickup || !location) return;
    setPlacing(true);
    setError(null);
    try {
      const order = await orderService.createOrder({
        customerId,
        contact: { name: details.name, phone: details.phone, email: details.email || undefined },
        vendorId: vendor.id,
        address: {
          line1: details.line1,
          line2: details.line2,
          landmark: details.landmark || undefined,
          areaId: location.areaId,
          areaName: location.areaName,
          pincode: location.pincode,
          city: location.city,
        },
        pickup,
        lines: cart.map(({ itemId, quantity }) => ({ itemId, quantity })),
        instructions: details.instructions,
        honeypot: details.honeypot,
        clientTotal: pricing.total,
      });

      if (details.saveAddress && customerId) {
        // Best effort — a failed address save must never block a placed order.
        customerService
          .saveAddress({
            label: "Other",
            line1: details.line1,
            line2: details.line2,
            landmark: details.landmark || undefined,
            areaId: location.areaId,
            areaName: location.areaName,
            pincode: location.pincode,
            city: location.city,
          })
          .catch(() => undefined);
      }

      setLastPlacedOrder(order.id);
      onPlaced();
      router.push("/book/confirmation");
    } catch (err) {
      setError({ message: getErrorMessage(err), slotTaken: isServiceError(err, "unavailable") });
      setPlacing(false);
      requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  };

  const placeButton = (size: "md" | "lg") => (
    <Button
      size={size}
      fullWidth
      onClick={placeOrder}
      loading={placing}
      loadingText="Placing your order…"
      trailingIcon={<ArrowRight className="size-5" aria-hidden="true" />}
    >
      Place Laundry Order
    </Button>
  );

  return (
    <Container>
      <StepHeader
        eyebrow="Step 5 of 5 · Review"
        title="Review your order"
        description="Check everything looks right. You won't be charged now — pay your partner after delivery."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:gap-12">
        <OrderReviewCard summary={summary} details={details} deliveryWindow={deliveryWindow} />

        <aside className="space-y-4 lg:sticky lg:top-40" aria-label="Payment summary">
          <section aria-labelledby="payment-title" className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
            <h2 id="payment-title" className="font-bold text-ink-900">
              Payment summary
            </h2>
            <div className="mt-4">
              <PriceBreakdown pricing={pricing} totalLabel="Total payable" />
            </div>
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm text-ink-600">
              <li className="flex gap-2">
                <Wallet className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                Pay after delivery — cash or UPI to your partner
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                Item count is confirmed at pickup; you only pay for what&apos;s collected
              </li>
              <li className="flex gap-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                Free rescheduling up to 1 hour before pickup
              </li>
            </ul>

            <div ref={errorRef}>
              {error && (
                <ErrorState
                  inline
                  className="mt-5"
                  title="We couldn't place your order. Please try again."
                  message={error.message}
                  onRetry={error.slotTaken ? undefined : placeOrder}
                  actions={
                    error.slotTaken ? (
                      <ButtonLink href="/book/schedule" size="sm" variant="danger">
                        Choose another time
                      </ButtonLink>
                    ) : undefined
                  }
                />
              )}
            </div>

            <div className="mt-5 hidden lg:block">{placeButton("lg")}</div>
          </section>
        </aside>
      </div>

      {/* Mobile place-order bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgb(11_16_25/0.18)] backdrop-blur-md sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <div className="shrink-0">
            <p className="text-xs font-medium text-ink-500">Total payable</p>
            <p className="text-lg font-bold tabular-nums tracking-tight text-ink-900">{formatINR(pricing.total)}</p>
          </div>
          <div className="min-w-0 flex-1">{placeButton("lg")}</div>
        </div>
      </div>
    </Container>
  );
}
