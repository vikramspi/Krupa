"use client";

import { CalendarCheck, ListFilter } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import { VENDOR_SORT_LABELS, sortVendors, type VendorSort } from "@/lib/matching";
import type { MatchedVendor, ServiceOfferingId } from "@/types";
import { VendorCard } from "./VendorCard";

interface VendorListProps {
  vendors: MatchedVendor[];
  offeringNames: Partial<Record<ServiceOfferingId, string>>;
  sort: VendorSort;
  onSortChange: (sort: VendorSort) => void;
  pickupTodayOnly: boolean;
  onPickupTodayChange: (value: boolean) => void;
  selectedVendorId: string | null;
  onSelect: (vendor: MatchedVendor) => void;
}

export function VendorList({
  vendors,
  offeringNames,
  sort,
  onSortChange,
  pickupTodayOnly,
  onPickupTodayChange,
  selectedVendorId,
  onSelect,
}: VendorListProps) {
  const visible = sortVendors(
    pickupTodayOnly ? vendors.filter((v) => v.pickupToday) : vendors,
    sort,
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <fieldset className="min-w-0">
          <legend className="sr-only">Sort partners by</legend>
          <div className="no-scrollbar relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <ListFilter className="mt-2 size-4 shrink-0 text-ink-400" aria-hidden="true" />
            {(Object.keys(VENDOR_SORT_LABELS) as VendorSort[]).map((option) => (
              <label
                key={option}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600",
                  sort === option ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-ink-700 hover:border-ink-300",
                )}
              >
                <input
                  type="radio"
                  name="vendor-sort"
                  value={option}
                  checked={sort === option}
                  onChange={() => onSortChange(option)}
                  className="sr-only"
                />
                {VENDOR_SORT_LABELS[option]}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="inline-flex shrink-0 cursor-pointer items-center gap-2.5 self-start text-sm font-semibold text-ink-700 sm:self-auto">
          <input
            type="checkbox"
            role="switch"
            checked={pickupTodayOnly}
            onChange={(event) => onPickupTodayChange(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="relative h-6 w-10 rounded-full bg-ink-200 transition-colors peer-checked:bg-brand-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-600 after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-4"
          />
          Pickup today only
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {visible.length} of {vendors.length} partners, sorted by {VENDOR_SORT_LABELS[sort]}.
      </p>

      {visible.length === 0 ? (
        <EmptyState
          className="mt-6 rounded-3xl border border-dashed border-ink-200 bg-white"
          icon={<CalendarCheck />}
          title="No partners can pick up today"
          description="Every partner near you is booked for today, but most have slots tomorrow morning."
          actions={<Button onClick={() => onPickupTodayChange(false)}>Show all partners</Button>}
          headingLevel="h3"
        />
      ) : (
        <ul className="mt-7 grid gap-x-4 gap-y-6 md:grid-cols-2">
          {visible.map((vendor, index) => (
            <li key={vendor.id} style={{ animationDelay: `${index * 60}ms` }}>
              <VendorCard
                vendor={vendor}
                offeringNames={offeringNames}
                selected={vendor.id === selectedVendorId}
                onSelect={() => onSelect(vendor)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
