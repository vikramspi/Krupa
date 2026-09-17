"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import type { QuantityUpdate } from "@/state/bookingStore";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: QuantityUpdate) => void;
  itemName: string;
  max?: number;
  disabled?: boolean;
}

/**
 * "Add" button that turns into a − n + stepper. Focus is kept on a sensible
 * control when the component swaps between the two states.
 */
export function QuantitySelector({ value, onChange, itemName, max = 50, disabled = false }: QuantitySelectorProps) {
  const addRef = useRef<HTMLButtonElement>(null);
  const plusRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"add" | "plus" | null>(null);

  useEffect(() => {
    if (pendingFocus.current === "plus") plusRef.current?.focus();
    if (pendingFocus.current === "add") addRef.current?.focus();
    pendingFocus.current = null;
  }, [value]);

  if (value === 0) {
    return (
      <button
        ref={addRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          pendingFocus.current = "plus";
          onChange(1);
        }}
        aria-label={`Add ${itemName}`}
        className="inline-flex h-10 min-w-[92px] items-center justify-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-4 text-sm font-bold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 active:bg-brand-200 disabled:cursor-not-allowed disabled:border-ink-200 disabled:bg-ink-50 disabled:text-ink-400"
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
        Add
      </button>
    );
  }

  return (
    <div role="group" aria-label={`${itemName} quantity`} className="inline-flex h-10 min-w-[92px] items-center rounded-full bg-brand-600 text-white shadow-card">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (value === 1) pendingFocus.current = "add";
          onChange((current) => current - 1);
        }}
        aria-label={value === 1 ? `Remove ${itemName}` : `Remove one ${itemName}`}
        className="flex size-10 items-center justify-center rounded-full transition-colors hover:bg-brand-700 active:bg-brand-800"
      >
        <Minus className="size-4" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-6 text-center text-[15px] font-bold tabular-nums">
        {value}
        <span className="sr-only"> {itemName} selected</span>
      </output>
      <button
        ref={plusRef}
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onChange((current) => current + 1)}
        aria-label={`Add one more ${itemName}`}
        className={cn(
          "flex size-10 items-center justify-center rounded-full transition-colors hover:bg-brand-700 active:bg-brand-800",
          "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        )}
      >
        <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
