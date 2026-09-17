"use client";

import { OrderReviewCard } from "@/components/reviews/OrderReviewCard";
import { ArrowLeft, CalendarClock, Headset, LogIn, MapPin, PackageCheck, PackageSearch, SearchX } from "lucide-react";
import Link from "next/link";
import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { VendorAvatar } from "@/components/booking/VendorAvatar";
import { OrderStatusBadge } from "@/components/tracking/OrderStatusBadge";
import { OrderTrackingTimeline } from "@/components/tracking/OrderTrackingTimeline";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { RatingPill } from "@/components/ui/RatingStars";
import { useAsync } from "@/hooks/useAsync";
import { useCustomer } from "@/hooks/useCustomer";
import { siteConfig } from "@/lib/config";
import { formatDateTime, formatINR, formatLongDate, formatPhone, formatRelativeDay } from "@/lib/format";
import { isActiveOrder } from "@/lib/orderStatus";
import { formatDeliveryWindow } from "@/lib/schedule";
import { orderService } from "@/services";
import { ReorderButton } from "./ReorderButton";

export function AccountOrderDetail({ orderId }: { orderId: string }) {
  const customer = useCustomer();
  const order = useAsync(() => orderService.getOrder(orderId), `account-order:${orderId}`, {
    enabled: customer.isSignedIn && customer.status === "success",
  });

  if (!customer.sessionReady || (customer.isSignedIn && customer.status === "loading")) return <LoadingState className="py-24" />;

  if (!customer.isSignedIn) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          className="rounded-[32px] border border-line bg-white py-14 shadow-card"
          tone="brand"
          icon={<LogIn />}
          title="Log in to view this order"
          actions={
            <>
              <ButtonLink href={`/login?next=/account/orders/${orderId}`}>Log in</ButtonLink>
              <ButtonLink href={`/track/${orderId}`} variant="outline">
                Track with mobile number
              </ButtonLink>
            </>
          }
        />
      </Container>
    );
  }

  if (customer.status === "error") {
    return (
      <Container size="narrow" className="py-16">
        <ErrorState title="We couldn't load your account" message={customer.error ?? ""} onRetry={customer.reload} />
      </Container>
    );
  }

  if (order.status === "loading" || order.status === "idle") return <LoadingState title="Loading order…" className="py-24" />;

  // The endpoint only returns orders belonging to the signed-in customer.
  if (order.status === "error" || !order.data) {
    return (
      <Container size="narrow" className="py-16">
        <EmptyState
          className="rounded-[32px] border border-line bg-white py-14 shadow-card"
          icon={<SearchX />}
          title="This order isn't in your account"
          description={`We couldn't find ${orderId} among your orders. It may have been placed with a different mobile number.`}
          actions={
            <>
              <ButtonLink href="/account">Back to my orders</ButtonLink>
              <ButtonLink href="/track" variant="outline">
                Track with order ID
              </ButtonLink>
            </>
          }
        />
      </Container>
    );
  }

  const o = order.data;
  const active = isActiveOrder(o.status);
  const deliveredAt = o.statusHistory.find((e) => e.status === "delivered")?.at;

  return (
    <Container className="pb-20 pt-8 sm:pt-10">
      <Link href="/account" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        My orders
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-[-0.03em] text-ink-950">
            <span className="font-mono tracking-normal">{o.id}</span>
            <OrderStatusBadge status={o.status} size="md" />
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-500">
            Placed {formatLongDate(o.createdAt)} · {o.pricing.itemCount} items · {formatINR(o.pricing.total)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReorderButton order={o} size="md" />
          {active && (
            <ButtonLink href={`/track/${o.id}`} variant="outline" leadingIcon={<PackageSearch className="size-4" aria-hidden="true" />}>
              Track order
            </ButtonLink>
          )}
        </div>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          <OrderReviewCard order={o} />
          <Card as="section" aria-labelledby="detail-items">
            <h2 id="detail-items" className="font-bold text-ink-900">
              Items
            </h2>
            <table className="mt-3 w-full text-[15px]">
              <caption className="sr-only">Items in order {o.id}</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Quantity and price</th>
                  <th scope="col">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {o.lines.map((line) => (
                  <tr key={line.itemId}>
                    <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink-800">
                      {line.name}
                    </th>
                    <td className="whitespace-nowrap py-2.5 text-right text-ink-500">
                      {line.quantity} × {formatINR(line.unitPrice)}
                    </td>
                    <td className="whitespace-nowrap py-2.5 pl-3 text-right font-semibold tabular-nums text-ink-900">
                      {formatINR(line.quantity * line.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 border-t border-line pt-4">
              <PriceBreakdown pricing={o.pricing} totalLabel={o.status === "delivered" ? "Total paid" : "Payable on delivery"} />
            </div>
          </Card>

          <Card as="section" aria-labelledby="detail-timeline">
            <h2 id="detail-timeline" className="mb-5 font-bold text-ink-900">
              Order timeline
            </h2>
            <OrderTrackingTimeline order={o} compact />
          </Card>
        </div>

        <aside className="space-y-6" aria-label="Order information">
          <Card as="section" aria-labelledby="detail-partner" className="p-5" padding="sm">
            <h2 id="detail-partner" className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Laundry partner
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <VendorAvatar id={o.vendor.id} name={o.vendor.name} />
              <div>
                <p className="font-semibold text-ink-900">{o.vendor.name}</p>
                <RatingPill rating={o.vendor.rating} className="text-sm" />
              </div>
            </div>
          </Card>

          <Card as="section" aria-labelledby="detail-pickup" className="p-5" padding="sm">
            <h2 id="detail-pickup" className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Pickup & delivery
            </h2>
            <ul className="mt-3 space-y-3 text-[15px]">
              <li className="flex gap-3">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-ink-900">
                    {formatRelativeDay(o.pickup.date)}, {o.pickup.slotLabel}
                  </span>
                  <span className="text-sm text-ink-500">Pickup</span>
                </span>
              </li>
              <li className="flex gap-3">
                <PackageCheck className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-ink-900">
                    {deliveredAt ? formatDateTime(deliveredAt) : formatDeliveryWindow(o.estimatedDelivery.from, o.estimatedDelivery.to)}
                  </span>
                  <span className="text-sm text-ink-500">{deliveredAt ? "Delivered" : "Estimated delivery"}</span>
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <address className="not-italic text-ink-700">
                  {o.address.line1}, {o.address.line2}
                  <span className="block text-sm text-ink-500">
                    {o.address.areaName}, {o.address.city} {o.address.pincode}
                  </span>
                </address>
              </li>
            </ul>
          </Card>

          <div className="flex items-start gap-3 rounded-3xl bg-brand-50 p-5 text-[15px]">
            <Headset className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
            <p className="text-brand-900">
              Questions about this order? Call{" "}
              <a href={`tel:+91${siteConfig.supportPhone}`} className="font-semibold underline underline-offset-4">
                {formatPhone(siteConfig.supportPhone)}
              </a>
              .
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
