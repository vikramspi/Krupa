"use client";

import { RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookingStepLayout } from "@/components/booking/BookingStepLayout";
import { ServiceCategoryTabs, categoryPanelId, categoryTabId } from "@/components/booking/ServiceCategoryTabs";
import { ServiceItemRow } from "@/components/booking/ServiceItemRow";
import { Alert } from "@/components/ui/Alert";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState, Skeleton } from "@/components/ui/LoadingState";
import { StepHeader } from "@/components/ui/StepHeader";
import { useAsync } from "@/hooks/useAsync";
import { useBookingGuard } from "@/hooks/useBookingGuard";
import { useBookingSummary } from "@/hooks/useBookingSummary";
import { serviceCatalog } from "@/services";
import { MAX_ITEM_QUANTITY, useBookingStore } from "@/state/bookingStore";
import type { ServiceCategory } from "@/types";

export default function ServicesStepPage() {
  const ready = useBookingGuard("services");
  const vendorId = useBookingStore((s) => s.vendor?.id);
  if (!ready || !vendorId) return <LoadingState title="Loading your booking…" />;
  return <ServicesStep key={vendorId} vendorId={vendorId} />;
}

function ServicesStep({ vendorId }: { vendorId: string }) {
  const router = useRouter();
  const summary = useBookingSummary();
  const vendor = summary.vendor!;
  const setQuantity = useBookingStore((s) => s.setQuantity);
  const syncCartWithCatalog = useBookingStore((s) => s.syncCartWithCatalog);
  const reorderSourceId = useBookingStore((s) => s.reorderSourceId);
  const dismissReorderNotice = useBookingStore((s) => s.dismissReorderNotice);

  const [activeCategory, setActiveCategory] = useState<ServiceCategory>("everyday");
  const [removedDismissed, setRemovedDismissed] = useState(false);
  // Snapshot of the cart on arrival, so the "removed items" notice is computed once and idempotently.
  const [cartOnArrival] = useState(() => useBookingStore.getState().cart);

  const catalog = useAsync(async () => {
    const [items, categories] = await Promise.all([serviceCatalog.getServices(vendorId), serviceCatalog.getCategories()]);
    // Re-price anything already in the cart for this partner; drop items they don't handle.
    syncCartWithCatalog(items);
    const offered = new Set(items.filter((item) => item.available).map((item) => item.id));
    const removed = cartOnArrival.filter((line) => !offered.has(line.itemId)).map((line) => line.name);
    return { items, categories, removed };
  }, `catalog:${vendorId}`);

  const quantities = useMemo(() => new Map(summary.cart.map((line) => [line.itemId, line.quantity])), [summary.cart]);
  const selectedCounts = useMemo(() => {
    const counts: Partial<Record<ServiceCategory, number>> = {};
    for (const line of summary.cart) counts[line.category] = (counts[line.category] ?? 0) + line.quantity;
    return counts;
  }, [summary.cart]);

  const header = (
    <StepHeader
      eyebrow="Step 3 of 5 · Services"
      title="What would you like cleaned?"
      description={
        <>
          Prices shown are <strong className="font-semibold text-ink-700">{vendor.name}</strong>&apos;s rates. Your total
          updates as you add items.
        </>
      }
    />
  );

  if (catalog.status === "loading" || catalog.status === "idle") {
    return (
      <BookingStepLayout summary={summary} continueLabel="Continue" onContinue={() => {}} continueDisabled>
        {header}
        <div role="status" aria-label="Loading services" className="mt-8">
          <Skeleton className="h-14 rounded-2xl" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-[68px] rounded-2xl" />
            ))}
          </div>
        </div>
      </BookingStepLayout>
    );
  }

  if (catalog.status === "error" || !catalog.data) {
    return (
      <Container size="narrow">
        {header}
        <ErrorState
          className="mt-6"
          title="We couldn't load this partner's services"
          message={catalog.error ?? "Please try again."}
          onRetry={catalog.reload}
          actions={
            <ButtonLink href="/book/vendors" variant="outline">
              Choose another partner
            </ButtonLink>
          }
        />
      </Container>
    );
  }

  const { items, categories, removed } = catalog.data;
  const cartEmpty = summary.cart.length === 0;

  return (
    <BookingStepLayout
      summary={summary}
      continueLabel="Continue"
      onContinue={() => router.push("/book/schedule")}
      continueDisabled={cartEmpty}
      continueHint="Add at least one item to continue"
      onRemoveItem={(itemId) => {
        const line = summary.cart.find((l) => l.itemId === itemId);
        if (line) setQuantity(line, 0);
      }}
    >
      {header}

      <div className="mt-6 space-y-3 empty:hidden">
        {reorderSourceId && (
          <Alert
            tone="info"
            title={`Items from order ${reorderSourceId} are ready`}
            role="status"
            action={
              <button type="button" onClick={dismissReorderNotice} aria-label="Dismiss" className="-m-1 rounded-full p-1 hover:bg-sky-100">
                <X className="size-4" aria-hidden="true" />
              </button>
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Prices reflect {vendor.name}&apos;s current rates. Adjust quantities before continuing.
            </span>
          </Alert>
        )}
        {removed.length > 0 && !removedDismissed && (
          <Alert
            tone="warning"
            title="Some items were removed"
            role="status"
            action={
              <button type="button" onClick={() => setRemovedDismissed(true)} aria-label="Dismiss" className="-m-1 rounded-full p-1 hover:bg-amber-100">
                <X className="size-4" aria-hidden="true" />
              </button>
            }
          >
            {vendor.name} doesn&apos;t handle: {removed.join(", ")}.
          </Alert>
        )}
      </div>

      {/* Sticks directly beneath the 109px booking header (logo row + progress indicator) on small screens. */}
      <div className="sticky top-[109px] z-20 -mx-4 mt-6 bg-canvas/95 px-4 py-2 backdrop-blur-md sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <ServiceCategoryTabs
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
          selectedCounts={selectedCounts}
        />
      </div>

      {categories.map((category) => {
        const categoryItems = items
          .filter((item) => item.category === category.id)
          .sort((a, b) => Number(b.available) - Number(a.available));
        return (
          <div
            key={category.id}
            role="tabpanel"
            id={categoryPanelId(category.id)}
            aria-labelledby={categoryTabId(category.id)}
            hidden={category.id !== activeCategory}
            tabIndex={0}
            className="mt-4 rounded-3xl border border-line bg-white p-2 shadow-card focus-visible:outline-offset-4 sm:p-3"
          >
            <p className="px-3 pb-2 pt-2 text-sm text-ink-500 sm:px-4">{category.description}</p>
            <ul className="space-y-1">
              {categoryItems.map((item) => (
                <li key={item.id}>
                  <ServiceItemRow
                    item={item}
                    vendorName={vendor.name}
                    quantity={quantities.get(item.id) ?? 0}
                    max={MAX_ITEM_QUANTITY}
                    onQuantityChange={(quantity) =>
                      setQuantity({ itemId: item.id, name: item.name, category: item.category, unitPrice: item.price }, quantity)
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="mt-4 px-1 text-sm text-ink-500">
        Not sure about a garment? Add your best guess — the partner confirms the final count at pickup and you only pay
        for what&apos;s actually collected.
      </p>
    </BookingStepLayout>
  );
}
