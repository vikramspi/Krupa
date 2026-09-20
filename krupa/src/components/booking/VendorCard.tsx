"use client";

import { CalendarCheck, CalendarClock, Clock, MapPin, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RatingPill } from "@/components/ui/RatingStars";
import { cn } from "@/lib/cn";
import { MATCH_REASON_LABELS } from "@/lib/matching";
import type { MatchedVendor, ServiceOfferingId } from "@/types";
import { VendorAvatar } from "./VendorAvatar";
import { priceLevel, turnaroundLabel } from "./vendorLabels";

interface VendorCardProps {
  vendor: MatchedVendor;
  offeringNames: Partial<Record<ServiceOfferingId, string>>;
  selected: boolean;
  onSelect: () => void;
}

const MAX_CHIPS = 4;

export function VendorCard({ vendor, offeringNames, selected, onSelect }: VendorCardProps) {
  const reasons = vendor.matchReasons.filter((r) => r !== "pickup_today").map((r) => MATCH_REASON_LABELS[r]);
  const price = priceLevel(vendor);
  const titleId = `vendor-${vendor.id}-name`;

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        "relative flex h-full flex-col rounded-3xl border bg-white p-5 shadow-card transition-[border-color,box-shadow] duration-200 sm:p-6",
        vendor.atCapacity ? "border-line" : "hover:border-ink-200 hover:shadow-raised",
        selected ? "border-brand-500 ring-4 ring-brand-100" : "border-line",
        vendor.isBestMatch && !selected && "border-brand-200",
      )}
    >
      {vendor.isBestMatch && (
        <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-sm bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow-card">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Best match
        </span>
      )}

      <div className={cn("flex items-start gap-4", vendor.atCapacity && "opacity-70")}>
        <VendorAvatar id={vendor.id} name={vendor.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 id={titleId} className="text-[17px] font-semibold leading-snug tracking-tight text-ink-900">
              {vendor.name}
            </h3>
            <RatingPill rating={vendor.rating} count={vendor.reviewCount > 0 ? vendor.reviewCount : undefined} className="shrink-0 pt-0.5" />
          </div>
          {vendor.distanceKm !== null && (
            <p className="mt-1 flex items-center gap-1 text-sm text-ink-500">
              <MapPin className="size-3.5" aria-hidden="true" />
              {vendor.distanceKm} km away
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {vendor.atCapacity ? (
          <Badge tone="warning">
            <TriangleAlert className="size-3.5" aria-hidden="true" />
            At capacity
          </Badge>
        ) : vendor.pickupToday ? (
          <Badge tone="success">
            <CalendarCheck className="size-3.5" aria-hidden="true" />
            Pickup available today
          </Badge>
        ) : (
          <Badge tone="neutral">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            Next pickup tomorrow
          </Badge>
        )}
        {selected && <Badge tone="brand">Selected</Badge>}
      </div>

      {reasons.length > 0 && !vendor.atCapacity && (
        <p className="mt-3 text-sm font-medium text-brand-700">{reasons.join(", ")}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-3.5 text-sm">
        <div>
          <dt className="text-ink-500">Turnaround</dt>
          <dd className="mt-0.5 flex items-center gap-1 font-semibold text-ink-900">
            <Clock className="size-3.5 text-ink-400" aria-hidden="true" />
            {turnaroundLabel(vendor)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-500">Pricing</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">
            <span aria-hidden="true" className="mr-1 text-brand-700">
              {price.symbol}
            </span>
            {price.label}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex-1">
        <p className="sr-only">Services offered:</p>
        <ul className="flex flex-wrap gap-1.5">
          {vendor.services.slice(0, MAX_CHIPS).map((id) => (
            <li key={id} className="rounded-sm border border-line px-2.5 py-0.5 text-xs font-medium text-ink-600">
              {offeringNames[id] ?? id}
            </li>
          ))}
          {vendor.services.length > MAX_CHIPS && (
            <li className="px-1.5 py-0.5 text-xs font-semibold text-ink-500">+{vendor.services.length - MAX_CHIPS} more</li>
          )}
        </ul>
      </div>

      <Button
        onClick={onSelect}
        variant={vendor.atCapacity ? "outline" : selected ? "primary" : "dark"}
        fullWidth
        className="mt-5"
        aria-describedby={titleId}
      >
        {vendor.atCapacity ? "View details" : selected ? "Selected — view details" : "Select Vendor"}
      </Button>
    </article>
  );
}
