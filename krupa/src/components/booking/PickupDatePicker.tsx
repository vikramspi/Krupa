"use client";

import { cn } from "@/lib/cn";
import type { PickupDateOption } from "@/lib/schedule";

interface PickupDatePickerProps {
  options: PickupDateOption[];
  value: string;
  onChange: (dateKey: string) => void;
}

/** Native radio group styled as date chips — arrow keys move between days. */
export function PickupDatePicker({ options, value, onChange }: PickupDatePickerProps) {
  return (
    <fieldset>
      <legend className="text-base font-bold text-ink-900">Pickup date</legend>
      <div className="no-scrollbar relative -mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        {options.map((option) => {
          const checked = option.key === value;
          return (
            <label
              key={option.key}
              className={cn(
                "flex min-w-[96px] shrink-0 cursor-pointer flex-col items-center rounded-2xl border px-3 py-3 text-center transition-[border-color,background-color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 sm:min-w-0",
                checked ? "border-brand-600 bg-brand-600 text-white shadow-card" : "border-line bg-white text-ink-800 hover:border-ink-300",
              )}
            >
              <input
                type="radio"
                name="pickup-date"
                value={option.key}
                checked={checked}
                onChange={() => onChange(option.key)}
                className="sr-only"
              />
              <span className="text-[15px] font-bold">{option.label}</span>
              <span className={cn("mt-0.5 text-sm", checked ? "text-brand-100" : "text-ink-500")}>{option.sublabel}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
