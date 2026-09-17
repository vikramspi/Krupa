"use client";

import { OfferingIcon } from "@/components/ui/ServiceIcon";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import type { QuantityUpdate } from "@/state/bookingStore";
import type { VendorCatalogItem } from "@/types";
import { QuantitySelector } from "./QuantitySelector";

interface ServiceItemRowProps {
  item: VendorCatalogItem;
  quantity: number;
  onQuantityChange: (quantity: QuantityUpdate) => void;
  vendorName: string;
  max?: number;
}

export function ServiceItemRow({ item, quantity, onQuantityChange, vendorName, max }: ServiceItemRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors sm:gap-4 sm:px-4",
        quantity > 0 ? "bg-brand-50/60" : "hover:bg-ink-50",
        !item.available && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          quantity > 0 ? "bg-white text-brand-700 shadow-card" : "bg-ink-100 text-ink-500",
        )}
        aria-hidden="true"
      >
        <OfferingIcon offeringId={item.offeringId} className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-snug text-ink-900">{item.name}</p>
        {item.available ? (
          <p className="mt-0.5 text-sm text-ink-500">
            <span className="font-semibold text-ink-800">{formatINR(item.price)}</span> / {item.unit}
            {item.note && <span className="hidden sm:inline"> · {item.note}</span>}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-ink-500">Not offered by {vendorName}</p>
        )}
      </div>

      {item.available && (
        <div className="flex shrink-0 items-center gap-3">
          {quantity > 0 && (
            <span className="hidden text-sm font-semibold tabular-nums text-ink-700 sm:inline" aria-hidden="true">
              {formatINR(item.price * quantity)}
            </span>
          )}
          <QuantitySelector value={quantity} onChange={onQuantityChange} itemName={item.name} max={max} />
        </div>
      )}
    </div>
  );
}
