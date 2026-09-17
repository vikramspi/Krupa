"use client";

import { ArrowRight, LocateFixed, MapPinOff, SearchX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AreaWaitlistForm } from "@/components/booking/AreaWaitlistForm";
import { LocationInput } from "@/components/booking/LocationInput";
import { SavedAddressPicker } from "@/components/booking/SavedAddressPicker";
import { BookingPage } from "@/components/layout/BookingLayout";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { StepHeader } from "@/components/ui/StepHeader";
import { useCustomer } from "@/hooks/useCustomer";
import { getErrorMessage } from "@/lib/errors";
import { locationService } from "@/services";
import { useBookingStore } from "@/state/bookingStore";
import { useStoresHydrated } from "@/state/hydration";
import type { BookingLocation, SavedAddress, ServiceArea, ServiceAreaCheckResult } from "@/types";

type Pending = { kind: "search" } | { kind: "saved"; id: string } | { kind: "current" } | null;

export default function LocationStepPage() {
  const router = useRouter();
  const hydrated = useStoresHydrated();
  const existingLocation = useBookingStore((s) => s.location);
  const setLocation = useBookingStore((s) => s.setLocation);
  const customer = useCustomer();

  // `null` means "not edited yet" — fall back to the location already in the booking.
  const [draft, setDraft] = useState<string | null>(null);
  const query = draft ?? (existingLocation?.source === "search" ? existingLocation.areaName : "");
  const [pending, setPending] = useState<Pending>(null);
  const [inputError, setInputError] = useState<string>();
  const [result, setResult] = useState<Exclude<ServiceAreaCheckResult, { status: "supported" }> | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  const proceed = (location: BookingLocation) => {
    setLocation(location);
    router.push("/book/vendors");
  };

  const checkAndProceed = async (
    value: string,
    kind: Exclude<Pending, null>,
    toLocation: (area: ServiceArea, check: Extract<ServiceAreaCheckResult, { status: "supported" }>) => BookingLocation,
  ) => {
    setInputError(undefined);
    setGeoError(null);
    setResult(null);
    setPending(kind);
    try {
      const check = await locationService.checkServiceArea(value);
      if (check.status === "supported") {
        proceed(toLocation(check.area, check));
        return;
      }
      setResult(check);
    } catch (error) {
      setInputError(getErrorMessage(error));
    }
    setPending(null);
  };

  const onSearch = (value: string) => {
    if (!value.trim()) {
      setInputError("Enter your area, locality or 6-digit pincode.");
      return;
    }
    const pincode = value.match(/\b[1-9]\d{5}\b/)?.[0];
    void checkAndProceed(value, { kind: "search" }, (area) =>
      locationService.toBookingLocation(area, { source: "search", pincode: pincode && area.pincodes.includes(pincode) ? pincode : undefined }),
    );
  };

  const onPickSaved = (address: SavedAddress) => {
    void checkAndProceed(address.pincode, { kind: "saved", id: address.id }, (area) =>
      locationService.toBookingLocation(area, {
        source: "saved",
        savedAddressId: address.id,
        pincode: address.pincode,
        addressLine: `${address.line1}, ${address.line2}`,
      }),
    );
  };

  const onUseCurrentLocation = async () => {
    setGeoError(null);
    setResult(null);
    setInputError(undefined);
    setPending({ kind: "current" });
    try {
      proceed(await locationService.resolveCurrentLocation());
    } catch (error) {
      setGeoError(getErrorMessage(error));
      setPending(null);
    }
  };

  const busy = pending !== null;
  const savedAddresses = customer.data?.addresses ?? [];

  return (
    <BookingPage>
      <StepHeader
        eyebrow="Step 1 of 5 · Location"
        title="Where should we pick up your laundry?"
        description="We'll find trusted laundry partners that serve your neighbourhood and can pick up at your door."
      />

      <Card className="mt-8" padding="lg">
        <form
          noValidate
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            onSearch(query);
          }}
        >
          <LocationInput
            label="Pickup area or pincode"
            value={query}
            onChange={(value) => {
              setDraft(value);
              setInputError(undefined);
              setResult(null);
            }}
            onSelectArea={(area) => onSearch(area.name)}
            onSubmit={() => onSearch(query)}
            error={inputError}
            disabled={busy}
            placeholder="e.g. Bandra West or 400050"
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
            <Button
              type="submit"
              size="lg"
              className="w-full sm:w-auto"
              loading={pending?.kind === "search"}
              loadingText="Checking your area"
              disabled={busy}
              trailingIcon={<ArrowRight className="size-5" aria-hidden="true" />}
            >
              Find laundry partners
            </Button>
            <Button
              variant="ghost"
              size="lg"
              className="w-full sm:w-auto"
              onClick={onUseCurrentLocation}
              disabled={busy}
              loading={pending?.kind === "current"}
              loadingText="Locating you…"
              leadingIcon={<LocateFixed className="size-5 text-brand-600" aria-hidden="true" />}
            >
              Use my current location
            </Button>
          </div>
        </form>

        {geoError && (
          <ErrorState inline className="mt-5" title="Couldn't detect your location" message={geoError} onRetry={onUseCurrentLocation} />
        )}

        <div aria-live="polite">
          {result && <LocationResult result={result} onPick={(area) => onSearch(area.name)} onDismiss={() => { setResult(null); setDraft(""); }} />}
        </div>

        <div className="mt-8 border-t border-line pt-6">
          {!hydrated || (customer.isSignedIn && customer.status === "loading") ? (
            <div className="grid gap-2.5 sm:grid-cols-2" aria-hidden="true">
              <Skeleton className="h-[68px] rounded-2xl" />
              <Skeleton className="h-[68px] rounded-2xl" />
            </div>
          ) : customer.isSignedIn && customer.status === "error" ? (
            <ErrorState inline title="Couldn't load your saved addresses" message={customer.error ?? ""} onRetry={customer.reload} />
          ) : customer.isSignedIn && savedAddresses.length > 0 ? (
            <SavedAddressPicker
              addresses={savedAddresses}
              onPick={onPickSaved}
              pendingId={pending?.kind === "saved" ? pending.id : null}
              selectedId={existingLocation?.savedAddressId}
              disabled={busy}
            />
          ) : customer.isSignedIn ? (
            <p className="text-sm text-ink-500">
              Addresses you save during checkout will appear here for faster booking next time.
            </p>
          ) : (
            <p className="text-sm text-ink-500">
              Booked with us before?{" "}
              <Link href="/login?next=/book/location" className="font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-800">
                Log in
              </Link>{" "}
              to use your saved addresses.
            </p>
          )}
        </div>
      </Card>
    </BookingPage>
  );
}

function LocationResult({
  result,
  onPick,
  onDismiss,
}: {
  result: Exclude<ServiceAreaCheckResult, { status: "supported" }>;
  onPick: (area: ServiceArea) => void;
  onDismiss: () => void;
}) {
  if (result.status === "coming_soon") {
    const place = result.area?.name ?? result.query;
    return (
      <div className="mt-6 animate-fade-up rounded-3xl border border-sun-100 bg-sun-50 p-5 sm:p-6">
        <div className="flex gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sun-700 shadow-card" aria-hidden="true">
            <MapPinOff className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-ink-900">We&apos;re coming soon to {place}</h2>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-600">
              {result.reason === "outside_city"
                ? "Krupa Laundry currently picks up within Mumbai. Nearby cities are next on our list."
                : "We don't have a laundry partner serving this area yet — we're onboarding new partners every month."}
            </p>
            <AreaWaitlistForm place={place} className="mt-4" />
            <button type="button" onClick={onDismiss} className="mt-4 text-sm font-semibold text-ink-700 underline underline-offset-4 hover:text-ink-900">
              Try a different address
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 animate-fade-up rounded-3xl border border-line bg-canvas p-5 sm:p-6">
      <div className="flex gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-ink-500 shadow-card" aria-hidden="true">
          <SearchX className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-ink-900">We couldn&apos;t find &ldquo;{result.query}&rdquo;</h2>
          <p className="mt-1 text-[15px] text-ink-600">Try your neighbourhood name or 6-digit pincode. Popular areas:</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {result.suggestions.map((area) => (
              <li key={area.id}>
                <button
                  type="button"
                  onClick={() => onPick(area)}
                  className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-800"
                >
                  {area.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
