"use client";

import {
  ArrowLeft,
  CalendarClock,
  Headset,
  MapPin,
  PackageCheck,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { VendorAvatar } from "@/components/booking/VendorAvatar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { LoadingState, Skeleton } from "@/components/ui/LoadingState";
import { RatingPill } from "@/components/ui/RatingStars";
import { useAsync } from "@/hooks/useAsync";
import { siteConfig } from "@/lib/config";
import { formatDateTime, formatLongDate, formatPhone, formatRelativeDay } from "@/lib/format";
import { ORDER_STATUS_SEQUENCE, statusIndex, statusMeta } from "@/lib/orderStatus";
import { recallGuestAccess } from "@/lib/guestTrackingAccess";
import { formatDeliveryWindow } from "@/lib/schedule";
import { orderService } from "@/services";
import { useSession } from "@/state/SessionProvider";
import type { Order } from "@/types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTrackingTimeline } from "./OrderTrackingTimeline";
import { TrackOrderLookupForm } from "./TrackOrderLookupForm";

export function TrackOrderView({ orderId }: { orderId: string }) {
  const session = useSession();
  const signedIn = !!session.customer;
  /** Set once a guest proves ownership with the order code + mobile number. */
  const [verified, setVerified] = useState<{ order: Order; phone: string } | null>(null);

  // The endpoint returns the order only when it belongs to the signed-in customer.
  const owned = useAsync(() => orderService.getOrder(orderId), `track:${orderId}`, {
    enabled: signedIn && !verified,
  });

  // A guest who just unlocked this order on /track isn't asked for the number again.
  const rememberedPhone = useSyncExternalStore(noopSubscribe, () => recallGuestAccess(orderId), () => null);
  const remembered = useAsync(() => orderService.lookupOrder(orderId, rememberedPhone ?? ""), `track-guest:${orderId}`, {
    enabled: !signedIn && !!rememberedPhone && !verified,
  });

  const order = verified?.order ?? owned.data ?? (signedIn ? null : remembered.data) ?? null;

  const refresh = () => {
    if (!verified && !signedIn && rememberedPhone) return remembered.reload();
    if (!verified) return owned.reload();
    void orderService.lookupOrder(orderId, verified.phone).then((fresh) => setVerified({ order: fresh, phone: verified.phone }));
  };

  if (session.status === "loading") return <LoadingState title="Loading your order…" className="py-24" />;
  if (order) return <OrderTracking order={order} onRefresh={refresh} signedIn={signedIn} />;
  if (signedIn && (owned.status === "loading" || owned.status === "idle")) return <TrackingSkeleton orderId={orderId} />;
  if (!signedIn && rememberedPhone && (remembered.status === "loading" || remembered.status === "idle")) {
    return <TrackingSkeleton orderId={orderId} />;
  }

  return <VerifyAccess orderId={orderId} onVerified={(found, phone) => setVerified({ order: found, phone })} />;
}

const noopSubscribe = () => () => {};

function VerifyAccess({ orderId, onVerified }: { orderId: string; onVerified: (order: Order, phone: string) => void }) {
  return (
    <Container size="narrow" className="py-12 sm:py-16">
      <Link href="/track" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Track another order
      </Link>
      <Card className="mt-6" padding="lg">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">
          <ShieldCheck className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">Confirm it&apos;s your order</h1>
        <p className="mt-1.5 text-[15px] text-ink-500">
          To protect your details, enter the mobile number used for order <span className="font-mono font-semibold text-ink-800">{orderId}</span>.
        </p>
        <div className="mt-6">
          <TrackOrderLookupForm
            defaultOrderId={orderId}
            lockOrderId
            submitLabel="View order status"
            onSuccess={(found) => onVerified(found, found.contact.phone)}
          />
        </div>
      </Card>
    </Container>
  );
}

function TrackingSkeleton({ orderId }: { orderId: string }) {
  return (
    <Container className="py-10" role="status" aria-label={`Loading order ${orderId}`}>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-4 h-10 w-72" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-96 rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    </Container>
  );
}

function statusHeadline(order: Order): { icon: typeof Truck; eta: string } {
  const lastEvent = order.statusHistory[order.statusHistory.length - 1];
  const pickupDay = formatRelativeDay(order.pickup.date);
  const window = formatDeliveryWindow(order.estimatedDelivery.from, order.estimatedDelivery.to);
  switch (order.status) {
    case "placed":
    case "vendor_assigned":
    case "pickup_scheduled":
      return { icon: CalendarClock, eta: `Pickup ${pickupDay === "Today" || pickupDay === "Tomorrow" ? pickupDay.toLowerCase() : `on ${pickupDay}`}, ${order.pickup.slotLabel}` };
    case "picked_up":
    case "processing":
    case "ready_for_delivery":
      return { icon: Sparkles, eta: `Estimated delivery: ${window}` };
    case "out_for_delivery":
      return { icon: Truck, eta: "Arriving soon — your delivery executive will call before reaching you" };
    case "delivered":
      return { icon: PackageCheck, eta: `Delivered ${formatDateTime(lastEvent.at)}` };
    case "cancelled":
      return { icon: XCircle, eta: lastEvent.note ? `Reason: ${lastEvent.note}` : `Cancelled ${formatDateTime(lastEvent.at)}` };
  }
}

function OrderTracking({ order, onRefresh, signedIn }: { order: Order; onRefresh: () => void; signedIn: boolean }) {
  const meta = statusMeta(order.status);
  const { icon: StatusIcon, eta } = statusHeadline(order);
  const progress = statusIndex(order.status) / (ORDER_STATUS_SEQUENCE.length - 1);
  return (
    <Container className="pb-20 pt-8 sm:pt-10">
      <Link
        href={signedIn ? "/account" : "/track"}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {signedIn ? "My orders" : "Track another order"}
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Order tracking</p>
          <h1 className="mt-1.5 flex flex-wrap items-center gap-3 text-3xl font-bold tracking-[-0.03em] text-ink-950 sm:text-4xl">
            <span>
              Order <span className="font-mono tracking-normal">{order.id}</span>
            </span>
            <OrderStatusBadge status={order.status} size="md" />
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-500">Placed on {formatLongDate(order.createdAt)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onRefresh} leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />} className="self-start sm:self-auto">
          Refresh status
        </Button>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-6">
          <section
            aria-labelledby="current-status"
            className={
              order.status === "delivered"
                ? "rounded-3xl bg-emerald-700 p-6 text-white sm:p-7"
                : order.status === "cancelled"
                  ? "rounded-3xl bg-ink-600 p-6 text-white sm:p-7"
                  : "rounded-3xl bg-ink-950 p-6 text-white sm:p-7"
            }
          >
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10" aria-hidden="true">
                <StatusIcon className="size-6" />
              </span>
              <div className="min-w-0" aria-live="polite">
                <h2 id="current-status" className="text-2xl font-bold tracking-tight">
                  {meta.label}
                </h2>
                <p className="mt-1 text-[15px] leading-relaxed text-white/75">{meta.description}</p>
                <p className="mt-3 font-semibold">{eta}</p>
              </div>
            </div>
            {order.status !== "cancelled" && (
            <div
              className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/15"
              role="progressbar"
              aria-label="Order progress"
              aria-valuemin={0}
              aria-valuemax={ORDER_STATUS_SEQUENCE.length}
              aria-valuenow={statusIndex(order.status) + 1}
              aria-valuetext={`Step ${statusIndex(order.status) + 1} of ${ORDER_STATUS_SEQUENCE.length}: ${meta.label}`}
            >
              <div className="h-full rounded-full bg-brand-300 transition-[width] duration-700" style={{ width: `${Math.max(6, progress * 100)}%` }} />
            </div>
            )}
          </section>

          <Card as="section" aria-labelledby="timeline-title">
            <h2 id="timeline-title" className="mb-6 font-bold text-ink-900">
              Timeline
            </h2>
            <OrderTrackingTimeline order={order} />
          </Card>

        </div>

        <aside className="space-y-6" aria-label="Order details">
          <Card as="section" aria-labelledby="partner-title" padding="sm" className="p-5">
            <h2 id="partner-title" className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Laundry partner
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <VendorAvatar id={order.vendor.id} name={order.vendor.name} />
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{order.vendor.name}</p>
                <RatingPill rating={order.vendor.rating} className="text-sm" />
              </div>
            </div>
            <ButtonLink href={`tel:+91${order.vendor.phone}`} variant="outline" size="sm" fullWidth className="mt-4" leadingIcon={<Phone className="size-4" aria-hidden="true" />}>
              Call partner
            </ButtonLink>
          </Card>

          <Card as="section" aria-labelledby="pickup-title" padding="sm" className="p-5">
            <h2 id="pickup-title" className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Pickup & delivery
            </h2>
            <ul className="mt-3 space-y-3 text-[15px]">
              <li className="flex gap-3">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-ink-900">
                    {formatRelativeDay(order.pickup.date)}, {order.pickup.slotLabel}
                  </span>
                  <span className="text-sm text-ink-500">Pickup slot</span>
                </span>
              </li>
              <li className="flex gap-3">
                <PackageCheck className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-ink-900">{formatDeliveryWindow(order.estimatedDelivery.from, order.estimatedDelivery.to)}</span>
                  <span className="text-sm text-ink-500">Estimated delivery</span>
                </span>
              </li>
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <address className="not-italic text-ink-700">
                  {order.address.line1}, {order.address.line2}
                  <span className="block text-sm text-ink-500">
                    {order.address.areaName}, {order.address.city} {order.address.pincode}
                  </span>
                </address>
              </li>
            </ul>
          </Card>

          <Card as="section" aria-labelledby="items-title" padding="sm" className="p-5">
            <h2 id="items-title" className="text-xs font-bold uppercase tracking-[0.12em] text-ink-400">
              Items & payment
            </h2>
            <ul className="mt-3 divide-y divide-line text-[15px]">
              {order.lines.map((line) => (
                <li key={line.itemId} className="flex justify-between gap-3 py-2">
                  <span className="text-ink-700">
                    {line.name} <span className="text-ink-400">× {line.quantity}</span>
                  </span>
                  <span className="tabular-nums text-ink-900">₹{line.unitPrice * line.quantity}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3">
              <PriceBreakdown pricing={order.pricing} totalLabel={order.status === "delivered" ? "Total" : "Payable on delivery"} />
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-3xl bg-brand-50 p-5 text-[15px]">
            <Headset className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
            <p className="text-brand-900">
              Need help with this order? Call{" "}
              <a href={`tel:+91${siteConfig.supportPhone}`} className="font-semibold underline underline-offset-4">
                {formatPhone(siteConfig.supportPhone)}
              </a>{" "}
              ({siteConfig.supportHours}).
            </p>
          </div>
        </aside>
      </div>
    </Container>
  );
}
