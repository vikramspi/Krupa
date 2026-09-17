"use client";

import { ArrowRight, Check, Clock, PackageSearch, Phone, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { trackPurchase } from "@/lib/analytics";
import { formatPhone, formatRelativeDay, formatShortDate } from "@/lib/format";
import { formatDeliveryWindow } from "@/lib/schedule";
import { orderService } from "@/services";
import { useBookingStore } from "@/state/bookingStore";
import { useStoresHydrated } from "@/state/hydration";
import { useSession } from "@/state/SessionProvider";

export default function ConfirmationPage() {
  const hydrated = useStoresHydrated();
  const orderId = useBookingStore((s) => s.lastPlacedOrderId);

  if (!hydrated) return <LoadingState title="Loading your confirmation…" />;
  if (!orderId) {
    return (
      <Container size="narrow">
        <EmptyState
          className="rounded-[32px] border border-line bg-white py-14 shadow-card"
          icon={<ShoppingBag />}
          title="No recent booking to show"
          description="Once you place an order, its confirmation will appear here. Looking for an existing order? Track it with your order ID."
          actions={
            <>
              <ButtonLink href="/book">Book a pickup</ButtonLink>
              <ButtonLink href="/track" variant="outline">
                Track an order
              </ButtonLink>
            </>
          }
        />
      </Container>
    );
  }
  return <Confirmation orderId={orderId} />;
}

function Confirmation({ orderId }: { orderId: string }) {
  const resetFlow = useBookingStore((s) => s.resetFlow);
  const signedIn = !!useSession().customer;
  const order = useAsync(() => orderService.getOrder(orderId), `order:${orderId}`);

  // The booking is complete: clear in-progress selections so "back" can't resubmit it.
  useEffect(() => {
    resetFlow();
  }, [resetFlow]);

  // Ad conversion — exactly once per order, even if this page re-renders or remounts.
  const conversionSent = useRef<string | null>(null);
  const placedOrder = order.data;
  useEffect(() => {
    if (!placedOrder || conversionSent.current === placedOrder.id) return;
    conversionSent.current = placedOrder.id;
    trackPurchase({
      orderId: placedOrder.id,
      value: placedOrder.pricing.total,
      itemCount: placedOrder.pricing.itemCount,
      vendorId: placedOrder.vendor.id,
    });
  }, [placedOrder]);

  if (order.status === "loading" || order.status === "idle") return <LoadingState title="Confirming your order…" />;
  if (order.status === "error" || !order.data) {
    return (
      <Container size="narrow">
        <ErrorState
          title="Your order was placed, but we couldn't load the details"
          message={`Your order ID is ${orderId}. ${order.error ?? ""}`}
          onRetry={order.reload}
          actions={<ButtonLink href={`/track/${orderId}`} variant="outline">Track order</ButtonLink>}
        />
      </Container>
    );
  }

  const o = order.data;
  const pickupDay = formatRelativeDay(o.pickup.date);
  const checklist = [
    { title: "Order received", detail: `Sent to ${o.vendor.name}`, done: true },
    {
      title: "Partner confirmation",
      detail: `${o.vendor.name} will confirm your pickup shortly — track it any time with your order ID.`,
      done: o.status !== "placed",
    },
    {
      title: "Requested pickup",
      detail: `${pickupDay === "Today" || pickupDay === "Tomorrow" ? pickupDay : formatShortDate(o.pickup.date)}, ${o.pickup.slotLabel}`,
      done: false,
    },
    { title: "Estimated delivery", detail: formatDeliveryWindow(o.estimatedDelivery.from, o.estimatedDelivery.to), done: false },
  ];

  return (
    <Container size="narrow">
      <div className="text-center">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-brand-600 shadow-raised animate-pop" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="size-10 text-white" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="48" className="animate-draw" />
          </svg>
        </div>
        <h1 className="mt-6 text-balance text-3xl font-bold tracking-[-0.035em] text-ink-950 sm:text-4xl">We&apos;ve received your order!</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-ink-500 sm:text-base">
          We&apos;ve sent it to {o.vendor.name}. Once they confirm, their pickup executive will call {formatPhone(o.contact.phone)} before arriving.
        </p>

        <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-line bg-white py-2.5 pl-5 pr-2.5 shadow-card">
          <span className="text-sm text-ink-500">Order ID</span>
          <span className="font-mono text-lg font-bold tracking-wide text-ink-900">{o.id}</span>
          <CopyButton value={o.id} label="Copy" />
        </div>
      </div>

      <div className="mt-10 grid gap-5 animate-fade-up [animation-delay:200ms]">
        <section aria-labelledby="checklist-title" className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
          <h2 id="checklist-title" className="sr-only">
            Booking status
          </h2>
          <ul className="space-y-4">
            {checklist.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  className={
                    item.done
                      ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
                      : "flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-400"
                  }
                  aria-hidden="true"
                >
                  {item.done ? <Check className="size-4" strokeWidth={3} /> : <Clock className="size-4" />}
                </span>
                <div>
                  <p className="font-semibold text-ink-900">
                    <span className="sr-only">{item.done ? "Done: " : "Next: "}</span>
                    {item.title}
                  </p>
                  <p className="text-[15px] text-ink-500">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="confirm-payment" className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-6">
          <div className="flex items-baseline justify-between">
            <h2 id="confirm-payment" className="font-bold text-ink-900">
              Payment
            </h2>
            <span className="text-sm text-ink-500">Pay after delivery</span>
          </div>
          <div className="mt-4">
            <PriceBreakdown pricing={o.pricing} totalLabel="Total payable" />
          </div>
        </section>

        <section aria-labelledby="next-steps" className="rounded-3xl bg-ink-950 p-5 text-white sm:p-6">
          <h2 id="next-steps" className="font-bold">
            What happens next
          </h2>
          <ol className="mt-4 space-y-3 text-[15px] text-ink-200">
            {[
              "Keep your clothes ready in a bag — no sorting needed.",
              "The pickup executive counts and tags every item at your door.",
              "Follow each step on the tracking page until delivery.",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <a href={`tel:+91${o.vendor.phone}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-300 hover:text-brand-200">
            <Phone className="size-4" aria-hidden="true" />
            Call {o.vendor.name}
          </a>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <ButtonLink href={`/track/${o.id}`} size="lg" leadingIcon={<PackageSearch className="size-5" aria-hidden="true" />}>
          Track Order
        </ButtonLink>
        <ButtonLink href="/" size="lg" variant="outline">
          Back to Home
        </ButtonLink>
      </div>

      {!signedIn && (
        <p className="mt-6 text-center text-sm text-ink-500">
          Keep your order ID handy — you can track it anytime with your mobile number.{" "}
          <Link href={`/login?next=/account`} className="inline-flex items-center gap-0.5 font-semibold text-brand-700 underline underline-offset-4">
            Log in to see all your orders <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </p>
      )}
    </Container>
  );
}
