"use client";

import { ArrowRight, ChevronUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Sheet } from "@/components/ui/Sheet";
import { formatINR } from "@/lib/format";
import type { BookingSummary } from "@/hooks/useBookingSummary";
import { OrderSummaryPanel } from "./OrderSummaryPanel";

interface BookingStepLayoutProps {
  children: ReactNode;
  summary: BookingSummary;
  continueLabel: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  /** Explains why Continue is disabled (announced and shown near the button). */
  continueHint?: string;
  showPickupInSummary?: boolean;
  onRemoveItem?: (itemId: string) => void;
  /** Hides the Continue button inside the desktop summary (e.g. when the form has its own submit). */
  hideDesktopContinue?: boolean;
}

/**
 * Two-column step layout: content on the left, a sticky order summary on the
 * right (desktop), and a fixed summary bar with a slide-up sheet on mobile.
 */
export function BookingStepLayout({
  children,
  summary,
  continueLabel,
  onContinue,
  continueDisabled = false,
  continueLoading = false,
  continueHint,
  showPickupInSummary = false,
  onRemoveItem,
  hideDesktopContinue = false,
}: BookingStepLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { pricing } = summary;

  const continueButton = (fullWidth: boolean, size: "md" | "lg") => (
    <Button
      size={size}
      fullWidth={fullWidth}
      onClick={onContinue}
      disabled={continueDisabled}
      loading={continueLoading}
      trailingIcon={<ArrowRight className="size-5" aria-hidden="true" />}
    >
      {continueLabel}
    </Button>
  );

  return (
    <Container>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start xl:gap-12">
        <div className="min-w-0">{children}</div>

        <aside className="hidden lg:sticky lg:top-40 lg:block" aria-label="Order summary">
          <OrderSummaryPanel
            summary={summary}
            onRemoveItem={onRemoveItem}
            showPickup={showPickupInSummary}
            footer={
              hideDesktopContinue ? undefined : (
                <>
                  {continueButton(true, "lg")}
                  {continueHint && continueDisabled && <p className="mt-2 text-center text-sm text-ink-500">{continueHint}</p>}
                </>
              )
            }
          />
        </aside>
      </div>

      {/* Mobile / tablet summary bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgb(11_16_25/0.18)] backdrop-blur-md sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1 text-left"
            aria-haspopup="dialog"
          >
            <span className="min-w-0">
              <span className="block text-xs font-medium text-ink-500">
                {pricing.itemCount > 0 ? `${pricing.itemCount} ${pricing.itemCount === 1 ? "item" : "items"} · View summary` : "No items yet"}
              </span>
              <span className="block text-lg font-bold tabular-nums tracking-tight text-ink-900">{formatINR(pricing.total)}</span>
            </span>
            <ChevronUp className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
          </button>
          <div className="shrink-0">{continueButton(false, "lg")}</div>
        </div>
        {continueHint && continueDisabled && <p className="mx-auto mt-1.5 max-w-3xl text-xs text-ink-500">{continueHint}</p>}
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Your order" hideTitle>
        <OrderSummaryPanel summary={summary} onRemoveItem={onRemoveItem} showPickup={showPickupInSummary} bare />
      </Sheet>
    </Container>
  );
}
