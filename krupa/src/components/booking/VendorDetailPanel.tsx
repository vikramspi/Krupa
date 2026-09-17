"use client";

import { CalendarCheck, CalendarClock, Clock, PackageCheck, Truck, X } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { RatingStars } from "@/components/ui/RatingStars";
import { VendorReviews } from "@/components/reviews/VendorReviews";
import { OfferingIcon } from "@/components/ui/ServiceIcon";
import { cn } from "@/lib/cn";
import { addDays, formatINR, formatShortDate, pluralize, toDateKey } from "@/lib/format";
import { FREE_PICKUP_THRESHOLD } from "@/lib/pricing";
import { estimateDeliveryWindow } from "@/lib/schedule";
import type { AsyncStatus } from "@/hooks/useAsync";
import type { MatchedVendor, ServiceCategoryInfo, ServiceOffering, VendorCatalogItem } from "@/types";
import { VendorAvatar } from "./VendorAvatar";
import { priceLevel, turnaroundLabel } from "./vendorLabels";

interface VendorDetailPanelProps {
  vendor: MatchedVendor;
  offerings: ServiceOffering[];
  categories: ServiceCategoryInfo[];
  prices: { status: AsyncStatus; items: VendorCatalogItem[] | undefined; error: string | null; reload: () => void };
}

export function VendorDetailPanel({ vendor, offerings, categories, prices }: VendorDetailPanelProps) {
  const now = new Date();
  const firstPickupDay = vendor.pickupToday ? now : addDays(now, 1);
  const delivery = estimateDeliveryWindow(toDateKey(firstPickupDay), "slot-1100", vendor.turnaroundHours);

  return (
    <div className="px-5 pb-8 pt-5 sm:px-6">
      {vendor.atCapacity && (
        <Alert tone="warning" title="This partner is currently at capacity" className="mb-5" role="alert">
          {vendor.name} isn&apos;t accepting new pickups right now. Please choose another partner near you — your
          location and selections are saved.
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <VendorAvatar id={vendor.id} name={vendor.name} size="lg" />
        <div className="min-w-0">
          {vendor.rating === null ? (
            <p className="text-sm text-ink-500">No customer ratings yet</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <RatingStars rating={vendor.rating} size="md" />
              <span className="text-sm font-semibold text-ink-900">{vendor.rating.toFixed(1)}</span>
              {vendor.reviewCount > 0 && (
                <a href="#vendor-reviews" className="text-sm text-ink-500 underline underline-offset-4 hover:text-ink-800">
                  {pluralize(vendor.reviewCount, "review")}
                </a>
              )}
            </div>
          )}
          {vendor.distanceKm !== null && <p className="mt-1 text-sm text-ink-500">{vendor.distanceKm} km away</p>}
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3">
        <Fact icon={<Clock />} label="Turnaround" value={turnaroundLabel(vendor)} />
        <Fact
          icon={vendor.pickupToday ? <CalendarCheck /> : <CalendarClock />}
          label="Pickup"
          value={vendor.atCapacity ? "Unavailable" : vendor.pickupToday ? "Available today" : "From tomorrow"}
        />
        <Fact
          icon={<PackageCheck />}
          label="Estimated delivery"
          value={vendor.atCapacity ? "—" : `By ${formatShortDate(delivery.to)}`}
          hint={vendor.atCapacity ? undefined : `If picked up ${vendor.pickupToday ? "today" : "tomorrow"}`}
        />
        <Fact icon={<Truck />} label="Pickup fee" value={formatINR(vendor.pickupFee)} hint={`Free over ${formatINR(FREE_PICKUP_THRESHOLD)}`} />
      </dl>

      <section aria-labelledby="vendor-services" className="mt-8">
        <h3 id="vendor-services" className="font-bold text-ink-900">
          Services
        </h3>
        <ul className="mt-3 grid grid-cols-2 gap-2">
          {offerings.map((offering) => {
            const offered = vendor.services.includes(offering.id);
            return (
              <li
                key={offering.id}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm",
                  offered ? "border-line bg-white text-ink-800" : "border-transparent bg-ink-50 text-ink-400",
                )}
              >
                <OfferingIcon offeringId={offering.id} className={cn("size-4 shrink-0", offered ? "text-brand-600" : "text-ink-300")} />
                <span className={cn("min-w-0 flex-1 truncate", !offered && "line-through")}>{offering.name}</span>
                {offered ? (
                  <span className="sr-only">(offered)</span>
                ) : (
                  <>
                    <X className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="sr-only">(not offered)</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="vendor-reviews" className="mt-8 scroll-mt-4">
        <h3 id="vendor-reviews" className="font-bold text-ink-900">
          Customer reviews
        </h3>
        <VendorReviews vendorId={vendor.id} vendorName={vendor.name} />
      </section>

      <section aria-labelledby="vendor-prices" className="mt-8">
        <div className="flex items-baseline justify-between">
          <h3 id="vendor-prices" className="font-bold text-ink-900">
            Pricing
          </h3>
          <Badge tone="neutral">{priceLevel(vendor).label}</Badge>
        </div>
        {prices.status === "loading" || prices.status === "idle" ? (
          <div className="mt-3 space-y-2" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        ) : prices.status === "error" ? (
          <ErrorState inline className="mt-3" title="Couldn't load prices" message={prices.error ?? ""} onRetry={prices.reload} />
        ) : (
          <div className="mt-3 space-y-5">
            {categories.map((category) => {
              const items = (prices.items ?? []).filter((item) => item.category === category.id && item.available);
              if (items.length === 0) return null;
              return (
                <table key={category.id} className="w-full text-[15px]">
                  <caption className="pb-1.5 text-left text-xs font-bold uppercase tracking-[0.12em] text-ink-400">{category.label}</caption>
                  <tbody className="divide-y divide-line">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <th scope="row" className="py-2 pr-3 text-left font-normal text-ink-700">
                          {item.name}
                        </th>
                        <td className="py-2 text-right font-semibold text-ink-900">
                          {formatINR(item.price)}
                          <span className="font-normal text-ink-400"> / {item.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Fact({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line p-3.5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500 [&_svg]:size-3.5">
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 font-bold text-ink-900">
        {value}
        {hint && <span className="block text-xs font-normal text-ink-500">{hint}</span>}
      </dd>
    </div>
  );
}
