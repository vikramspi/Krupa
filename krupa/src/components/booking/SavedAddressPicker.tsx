"use client";

import { Briefcase, ChevronRight, Home, MapPin } from "lucide-react";
import { Spinner } from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";
import type { AddressLabel, SavedAddress } from "@/types";

const labelIcon: Record<AddressLabel, typeof Home> = { Home, Work: Briefcase, Other: MapPin };

interface SavedAddressPickerProps {
  addresses: SavedAddress[];
  onPick: (address: SavedAddress) => void;
  pendingId?: string | null;
  selectedId?: string | null;
  disabled?: boolean;
}

export function SavedAddressPicker({ addresses, onPick, pendingId, selectedId, disabled }: SavedAddressPickerProps) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink-800">Your saved addresses</legend>
      <ul className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
        {addresses.map((address) => {
          const Icon = labelIcon[address.label];
          const pending = pendingId === address.id;
          return (
            <li key={address.id}>
              <button
                type="button"
                onClick={() => onPick(address)}
                disabled={disabled}
                aria-describedby={`${address.id}-desc`}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-[border-color,box-shadow] hover:border-brand-300 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60",
                  selectedId === address.id ? "border-brand-500 ring-4 ring-brand-100" : "border-line",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden="true">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink-900">{address.label}</span>
                  <span id={`${address.id}-desc`} className="block truncate text-sm text-ink-500">
                    {address.line1}, {address.areaName}
                  </span>
                </span>
                {pending ? (
                  <Spinner className="size-4 text-brand-600" />
                ) : (
                  <ChevronRight className="size-5 text-ink-300 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
