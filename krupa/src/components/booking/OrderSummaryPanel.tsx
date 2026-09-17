"use client";

import { CalendarClock, Clock, MapPin, ShoppingBasket, Truck, X } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { RatingPill } from "@/components/ui/RatingStars";
import { cn } from "@/lib/cn";
import { formatINR, formatRelativeDay } from "@/lib/format";
import { DISCOUNT_THRESHOLD, FREE_PICKUP_THRESHOLD } from "@/lib/pricing";
import type { BookingSummary } from "@/hooks/useBookingSummary";
import { VendorAvatar } from "./VendorAvatar";

interface OrderSummaryPanelProps {
  summary: BookingSummary;
  /** Shows remove buttons on each line. */
  onRemoveItem?: (itemId: string) => void;
  showPickup?: boolean;
  footer?: ReactNode;
  className?: string;
  /** Drop the card chrome (used inside the mobile sheet). */
  bare?: boolean;
}

function pickupDayPhrase(dateKey: string): string {
  const day = formatRelativeDay(dateKey);
  return day === "Today" || day === "Tomorrow" ? day.toLowerCase() : `on ${day}`;
}

export function OrderSummaryPanel({ summary, onRemoveItem, showPickup = false, footer, className, bare = false }: OrderSummaryPanelProps) {
  const { vendor, cart, pricing, nudge, turnaround, pickup, location } = summary;
  // The panel can render twice (desktop sidebar + mobile sheet), so ids must be unique.
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className={cn(!bare && "rounded-3xl border border-line bg-white shadow-card", className)}>
      <div className={cn("flex items-center justify-between", bare ? "px-5 pt-5 sm:px-6" : "px-5 pt-5")}>
        <h2 id={titleId} className="font-bold tracking-tight text-ink-900">
          Order summary
        </h2>
        {pricing.itemCount > 0 && (
          <span className="text-sm text-ink-500">
            {pricing.itemCount} {pricing.itemCount === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {vendor && (
        <div className="mx-5 mt-4 flex items-center gap-3 rounded-2xl bg-canvas p-3">
          <VendorAvatar id={vendor.id} name={vendor.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink-900">{vendor.name}</p>
            <RatingPill rating={vendor.rating} className="text-xs [&_svg]:size-3.5" />
          </div>
          <Link href="/book/vendors" className="rounded-full px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            Change<span className="sr-only"> laundry partner</span>
          </Link>
        </div>
      )}

      <div className="px-5 pb-5">
        {cart.length === 0 ? (
          <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-ink-200 px-4 py-8 text-center">
            <ShoppingBasket className="size-7 text-ink-300" aria-hidden="true" />
            <p className="mt-3 font-semibold text-ink-800">You haven&apos;t added any laundry items yet</p>
            <p className="mt-1 text-sm text-ink-500">Use the Add buttons to build your order. Prices update instantly.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-line" aria-label="Selected items">
            {cart.map((line) => (
              <li key={line.itemId} className="flex items-center gap-2 py-2.5 text-[15px]">
                <span className="min-w-0 flex-1">
                  <span className="text-ink-800">{line.name}</span>
                  <span className="text-ink-500"> × {line.quantity}</span>
                </span>
                <span className="font-semibold tabular-nums text-ink-900">{formatINR(line.unitPrice * line.quantity)}</span>
                {onRemoveItem && (
                  <button
                    type="button"
                    onClick={() => onRemoveItem(line.itemId)}
                    aria-label={`Remove ${line.name} from order`}
                    className="-mr-1.5 flex size-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-800"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {cart.length > 0 && (
          <>
            <dl className="mt-3 space-y-2 border-t border-line pt-4 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="font-medium tabular-nums text-ink-900">{formatINR(pricing.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Pickup & delivery</dt>
                <dd className="tabular-nums">
                  {pricing.pickupFee === 0 && pricing.pickupFeeOriginal > 0 ? (
                    <>
                      <span className="mr-1.5 text-ink-400 line-through">
                        <span className="sr-only">was </span>
                        {formatINR(pricing.pickupFeeOriginal)}
                      </span>
                      <span className="font-semibold text-emerald-700">Free</span>
                    </>
                  ) : (
                    <span className="font-medium text-ink-900">{formatINR(pricing.pickupFee)}</span>
                  )}
                </dd>
              </div>
              {pricing.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-emerald-700">{pricing.discountLabel}</dt>
                  <dd className="font-semibold tabular-nums text-emerald-700">−{formatINR(pricing.discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <dt className="font-bold text-ink-900">
                  Estimated total
                  <span className="block text-xs font-normal text-ink-500">Pay after delivery · cash or UPI</span>
                </dt>
                <dd className="text-xl font-bold tabular-nums tracking-tight text-ink-900" aria-live="polite" aria-atomic="true">
                  {formatINR(pricing.total)}
                </dd>
              </div>
            </dl>

            {nudge && (
              <div className="mt-4 rounded-2xl bg-brand-50 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-800">
                  <Truck className="size-4" aria-hidden="true" />
                  {nudge.message}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-100" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, (pricing.subtotal / (nudge.kind === "free_pickup" ? FREE_PICKUP_THRESHOLD : DISCOUNT_THRESHOLD)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {((turnaround && cart.length > 0) || (showPickup && (pickup || location))) && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink-600">
            {showPickup && pickup && (
              <li className="flex gap-2">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  Pickup {pickupDayPhrase(pickup.date)}, {pickup.slotLabel}
                </span>
              </li>
            )}
            {showPickup && location && (
              <li className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>{location.addressLine ?? `${location.areaName}, ${location.pincode}`}</span>
              </li>
            )}
            {turnaround && cart.length > 0 && (
              <li className="flex gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
                <span>
                  Expected delivery: {turnaround.min}–{turnaround.max} hours after pickup
                </span>
              </li>
            )}
          </ul>
        )}

        {footer && <div className="mt-5">{footer}</div>}
      </div>
    </section>
  );
}
