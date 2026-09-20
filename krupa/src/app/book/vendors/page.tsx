"use client";

import { MapPin, MapPinOff, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AreaWaitlistForm } from "@/components/booking/AreaWaitlistForm";
import { VendorDetailPanel } from "@/components/booking/VendorDetailPanel";
import { VendorList } from "@/components/booking/VendorList";
import { VendorMatchingLoader } from "@/components/booking/VendorMatchingLoader";
import { BookingPage } from "@/components/layout/BookingLayout";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState, Skeleton } from "@/components/ui/LoadingState";
import { Sheet } from "@/components/ui/Sheet";
import { useAsync } from "@/hooks/useAsync";
import { useBookingGuard } from "@/hooks/useBookingGuard";
import { atLeast } from "@/lib/delay";
import { pluralize } from "@/lib/format";
import type { VendorSort } from "@/lib/matching";
import { serviceCatalog, vendorService } from "@/services";
import { useBookingStore } from "@/state/bookingStore";
import type { MatchedVendor, ServiceOfferingId } from "@/types";

const MATCHING_ANIMATION_MS = 2800;

export default function VendorsStepPage() {
  const ready = useBookingGuard("vendors");
  const location = useBookingStore((s) => s.location);
  if (!ready || !location) return <LoadingState title="Loading your booking…" />;
  return <VendorsStep key={location.areaId} />;
}

function VendorsStep() {
  const router = useRouter();
  const location = useBookingStore((s) => s.location)!;
  const matchedAreaId = useBookingStore((s) => s.matchedAreaId);
  const markMatched = useBookingStore((s) => s.markMatched);
  const selectedVendor = useBookingStore((s) => s.vendor);
  const selectVendor = useBookingStore((s) => s.selectVendor);
  const reorderSourceId = useBookingStore((s) => s.reorderSourceId);
  const cartCount = useBookingStore((s) => s.cart.length);

  // Only play the full matching animation the first time we match this area in a session.
  const [animate] = useState(() => matchedAreaId !== location.areaId);
  const [sort, setSort] = useState<VendorSort>("best");
  const [pickupTodayOnly, setPickupTodayOnly] = useState(false);
  const [openVendorId, setOpenVendorId] = useState<string | null>(null);

  const match = useAsync(
    () =>
      Promise.all([
        atLeast(vendorService.getNearbyVendors(location), animate ? MATCHING_ANIMATION_MS : 0),
        serviceCatalog.getServiceOfferings(),
        serviceCatalog.getCategories(),
      ]),
    `match:${location.areaId}`,
  );

  useEffect(() => {
    if (match.status === "success") markMatched(location.areaId);
  }, [match.status, location.areaId, markMatched]);

  const [result, offerings, categories] = match.data ?? [];
  const offeringNames = useMemo(
    () => Object.fromEntries((offerings ?? []).map((o) => [o.id, o.name])) as Partial<Record<ServiceOfferingId, string>>,
    [offerings],
  );
  const openVendor = result?.vendors.find((v) => v.id === openVendorId) ?? null;

  const prices = useAsync(() => serviceCatalog.getServices(openVendorId ?? undefined), `prices:${openVendorId}`, {
    enabled: !!openVendorId,
  });

  const continueWith = (vendor: MatchedVendor) => {
    selectVendor({
      id: vendor.id,
      name: vendor.name,
      rating: vendor.rating,
      distanceKm: vendor.distanceKm,
      pickupFee: vendor.pickupFee,
      turnaroundHours: vendor.turnaroundHours,
    });
    router.push("/book/services");
  };

  if (match.status === "loading" || match.status === "idle") {
    return animate ? (
      <BookingPage>
        <VendorMatchingLoader areaName={location.areaName} />
      </BookingPage>
    ) : (
      <BookingPage wide>
        <div role="status" aria-label="Loading laundry partners">
          <Skeleton className="h-9 w-2/3 max-w-md" />
          <Skeleton className="mt-3 h-5 w-1/2 max-w-sm" />
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-72 rounded-3xl" />
            ))}
          </div>
        </div>
      </BookingPage>
    );
  }

  if (match.status === "error" || !result || !offerings || !categories) {
    return (
      <BookingPage>
        <ErrorState
          title="We couldn't load laundry partners"
          message={match.error ?? "Please check your connection and try again."}
          onRetry={match.reload}
          actions={
            <ButtonLink href="/book/location" variant="outline">
              Change location
            </ButtonLink>
          }
        />
      </BookingPage>
    );
  }

  const availableCount = result.vendors.filter((v) => !v.atCapacity).length;

  if (availableCount === 0) {
    const allBusy = result.vendors.length > 0;
    return (
      <BookingPage>
        <EmptyState
          className="border border-line bg-white py-14 shadow-card"
          tone="sun"
          icon={<MapPinOff />}
          title={allBusy ? `All partners near ${location.areaName} are fully booked` : `No laundry partners near ${location.areaName} yet`}
          description={
            allBusy
              ? "Every partner serving your area is at capacity right now. Capacity usually frees up within a few hours."
              : `We checked all ${result.evaluatedCount} partners in our network, but none currently pick up in ${location.areaName}. Try a nearby address, or we can notify you when a partner joins.`
          }
          actions={
            <>
              <ButtonLink href="/book/location" leadingIcon={<MapPin className="size-4" aria-hidden="true" />}>
                Try a different location
              </ButtonLink>
              <Button variant="outline" onClick={match.reload} leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}>
                Check again
              </Button>
            </>
          }
        />
        <div className="mx-auto mt-6 max-w-md">
          <p className="mb-2 text-center text-sm font-medium text-ink-600">Get notified when a partner is available</p>
          <AreaWaitlistForm place={location.areaName} />
        </div>
      </BookingPage>
    );
  }

  return (
    <BookingPage wide>
      <header>
        <p className="font-mono text-[13px] text-brand-700">Step 2 of 5</p>
        <h1 className="mt-1.5 text-balance text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink-900 sm:text-[2.1rem]">
          We found {pluralize(availableCount, "laundry partner")} near your location
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] text-ink-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-brand-600" aria-hidden="true" />
            Pickup from <strong className="font-semibold text-ink-800">{location.addressLine ?? `${location.areaName}, ${location.pincode}`}</strong>
          </span>
          <Link href="/book/location" className="font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800">
            Change
          </Link>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Ranked by distance, rating, turnaround, services and pickup availability across {result.evaluatedCount} partners.
        </p>
      </header>

      {reorderSourceId && !selectedVendor && cartCount > 0 && (
        <div role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[15px] text-amber-900">
          <p className="font-semibold">Your previous partner is at capacity right now</p>
          <p className="mt-0.5">
            Your items from order {reorderSourceId} are saved. Choose another partner below to continue — prices will update to
            their rates.
          </p>
        </div>
      )}

      {selectedVendor && result.vendors.some((v) => v.id === selectedVendor.id && !v.atCapacity) && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[15px] text-brand-900">
            You&apos;ve selected <strong className="font-semibold">{selectedVendor.name}</strong>.
          </p>
          <ButtonLink href="/book/services" size="sm">
            Continue to services
          </ButtonLink>
        </div>
      )}

      <div className="mt-8">
        <VendorList
          vendors={result.vendors}
          offeringNames={offeringNames}
          sort={sort}
          onSortChange={setSort}
          pickupTodayOnly={pickupTodayOnly}
          onPickupTodayChange={setPickupTodayOnly}
          selectedVendorId={selectedVendor?.id ?? null}
          onSelect={(vendor) => setOpenVendorId(vendor.id)}
        />
      </div>

      <Sheet
        open={!!openVendor}
        onClose={() => setOpenVendorId(null)}
        title={openVendor?.name ?? "Laundry partner"}
        description={openVendor ? `Serving ${location.areaName}` : undefined}
        footer={
          openVendor &&
          (openVendor.atCapacity ? (
            <Button fullWidth size="lg" variant="dark" onClick={() => setOpenVendorId(null)}>
              Choose another partner
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={() => continueWith(openVendor)}>
              Continue with this vendor
            </Button>
          ))
        }
      >
        {openVendor && (
          <VendorDetailPanel
            vendor={openVendor}
            offerings={offerings}
            categories={categories}
            prices={{ status: prices.status, items: prices.data, error: prices.error, reload: prices.reload }}
          />
        )}
      </Sheet>
    </BookingPage>
  );
}
