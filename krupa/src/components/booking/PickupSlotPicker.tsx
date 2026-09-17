"use client";

import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/cn";
import { isSlotBookable } from "@/lib/schedule";
import type { PickupSlot, SlotAvailability } from "@/types";

const availabilityCopy: Record<SlotAvailability, { label: string; className: string }> = {
  available: { label: "Available", className: "text-emerald-700" },
  limited: { label: "Few slots left", className: "text-amber-700" },
  full: { label: "Fully booked", className: "text-ink-500" },
  past: { label: "No longer available", className: "text-ink-500" },
};

interface PickupSlotPickerProps {
  slots: PickupSlot[];
  value: string | null;
  onChange: (slot: PickupSlot) => void;
}

/** Time windows as a radio group. Unavailable slots stay visible but disabled, with the reason. */
export function PickupSlotPicker({ slots, value, onChange }: PickupSlotPickerProps) {
  return (
    <fieldset>
      <legend className="text-base font-bold text-ink-900">Pickup time</legend>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {slots.map((slot) => {
          const bookable = isSlotBookable(slot);
          const checked = slot.id === value && bookable;
          const copy = availabilityCopy[slot.availability];
          return (
            <label
              key={slot.id}
              className={cn(
                "relative flex items-center gap-3 rounded-2xl border p-4 transition-[border-color,background-color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600",
                !bookable && "cursor-not-allowed border-dashed border-ink-200 bg-ink-50",
                bookable && !checked && "cursor-pointer border-line bg-white hover:border-ink-300",
                checked && "cursor-pointer border-brand-600 bg-brand-50 ring-4 ring-brand-100",
              )}
            >
              <input
                type="radio"
                name="pickup-slot"
                value={slot.id}
                checked={checked}
                disabled={!bookable}
                onChange={() => onChange(slot)}
                className="sr-only"
                aria-describedby={`${slot.id}-availability`}
              />
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl",
                  checked ? "bg-brand-600 text-white" : bookable ? "bg-ink-100 text-ink-600" : "bg-ink-100 text-ink-400",
                )}
                aria-hidden="true"
              >
                {checked ? <Check className="size-5" strokeWidth={2.5} /> : <Clock className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block font-semibold", bookable ? "text-ink-900" : "text-ink-400 line-through")}>{slot.label}</span>
                <span id={`${slot.id}-availability`} className={cn("block text-sm font-medium", copy.className)}>
                  {copy.label}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
