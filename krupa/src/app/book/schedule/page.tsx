"use client";

import { CalendarX2, PackageCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookingStepLayout } from "@/components/booking/BookingStepLayout";
import { PickupDatePicker } from "@/components/booking/PickupDatePicker";
import { PickupSlotPicker } from "@/components/booking/PickupSlotPicker";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState, Skeleton } from "@/components/ui/LoadingState";
import { StepHeader } from "@/components/ui/StepHeader";
import { useAsync } from "@/hooks/useAsync";
import { useBookingGuard } from "@/hooks/useBookingGuard";
import { useBookingSummary } from "@/hooks/useBookingSummary";
import { toDateKey } from "@/lib/format";
import { estimateDeliveryWindow, formatDeliveryWindow, getPickupDateOptions, isSlotBookable } from "@/lib/schedule";
import { vendorService } from "@/services";
import { useBookingStore } from "@/state/bookingStore";

export default function ScheduleStepPage() {
  const ready = useBookingGuard("schedule");
  if (!ready) return <LoadingState title="Loading your booking…" />;
  return <ScheduleStep />;
}

function ScheduleStep() {
  const router = useRouter();
  const summary = useBookingSummary();
  const vendor = summary.vendor!;
  const storedPickup = useBookingStore((s) => s.pickup);
  const setPickup = useBookingStore((s) => s.setPickup);

  const dateOptions = useMemo(() => getPickupDateOptions(new Date(), 5), []);
  const todayKey = toDateKey(new Date());
  const initialDate = storedPickup && storedPickup.date >= todayKey ? storedPickup.date : dateOptions[0].key;

  const [dateKey, setDateKey] = useState(initialDate);
  const [slotId, setSlotId] = useState<string | null>(storedPickup?.date === initialDate ? storedPickup.slotId : null);

  const slots = useAsync(() => vendorService.getPickupSlots(vendor.id, dateKey), `slots:${vendor.id}:${dateKey}`);
  const selectedSlot = slots.data?.find((s) => s.id === slotId && isSlotBookable(s)) ?? null;
  const noSlots = slots.status === "success" && !slots.data?.some(isSlotBookable);
  const nextDate = dateOptions[dateOptions.findIndex((d) => d.key === dateKey) + 1];

  const delivery = selectedSlot && summary.turnaround ? estimateDeliveryWindow(dateKey, selectedSlot.id, summary.turnaround) : null;

  const onContinue = () => {
    if (!selectedSlot) return;
    setPickup({ date: dateKey, slotId: selectedSlot.id, slotLabel: selectedSlot.label });
    router.push("/book/details");
  };

  return (
    <BookingStepLayout
      summary={summary}
      continueLabel="Continue"
      onContinue={onContinue}
      continueDisabled={!selectedSlot}
      continueHint="Choose a pickup time to continue"
      showPickupInSummary
    >
      <StepHeader
        eyebrow="Step 4 of 5 · Pickup"
        title="When should we pick up?"
        description={`Choose a day and a two-hour window. ${vendor.name}'s pickup executive will call you before arriving.`}
      />

      <Card className="mt-8 space-y-8" padding="lg">
        <PickupDatePicker
          options={dateOptions}
          value={dateKey}
          onChange={(key) => {
            setDateKey(key);
            setSlotId(null);
          }}
        />

        <div aria-live="polite" aria-busy={slots.status === "loading"}>
          {slots.status === "loading" || slots.status === "idle" ? (
            <div>
              <p className="text-base font-bold text-ink-900">Pickup time</p>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2" role="status" aria-label="Loading available pickup times">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-[74px] rounded-2xl" />
                ))}
              </div>
            </div>
          ) : slots.status === "error" ? (
            <ErrorState
              inline
              title="Couldn't load pickup times"
              message={slots.error ?? ""}
              onRetry={slots.reload}
              actions={
                <ButtonLink href="/book/vendors" size="sm" variant="outline">
                  Choose another partner
                </ButtonLink>
              }
            />
          ) : noSlots ? (
            <EmptyState
              className="rounded-2xl border border-dashed border-ink-200 py-8"
              icon={<CalendarX2 />}
              headingLevel="h3"
              title={dateKey === todayKey ? "No pickup slots left today" : "This day is fully booked"}
              description={`${vendor.name} has no open pickup windows on this day. Most partners have plenty of slots the next morning.`}
              actions={
                nextDate && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setDateKey(nextDate.key);
                      setSlotId(null);
                    }}
                  >
                    See {nextDate.label.toLowerCase() === "tomorrow" ? "tomorrow's" : `${nextDate.label}'s`} slots
                  </Button>
                )
              }
            />
          ) : (
            <PickupSlotPicker slots={slots.data ?? []} value={slotId} onChange={(slot) => setSlotId(slot.id)} />
          )}
        </div>

        {delivery && summary.turnaround && (
          <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4 animate-fade-up" role="status">
            <PackageCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
            <div className="text-[15px]">
              <p className="font-semibold text-brand-900">Estimated delivery: {formatDeliveryWindow(delivery.from, delivery.to)}</p>
              <p className="mt-0.5 text-brand-800">
                Expected delivery: {summary.turnaround.min}–{summary.turnaround.max} hours after pickup
                {summary.cart.some((l) => l.category === "specialty") ? " (includes extra care time for specialty items)." : "."}
              </p>
            </div>
          </div>
        )}
      </Card>
    </BookingStepLayout>
  );
}
