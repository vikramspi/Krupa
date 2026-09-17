"use client";

import { ArrowRight, CheckCircle2, MapPinOff, SearchX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AreaWaitlistForm } from "@/components/booking/AreaWaitlistForm";
import { LocationInput } from "@/components/booking/LocationInput";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { getErrorMessage } from "@/lib/errors";
import { pluralize } from "@/lib/format";
import { locationService } from "@/services";
import { useBookingStore } from "@/state/bookingStore";
import type { ServiceArea, ServiceAreaCheckResult } from "@/types";
import { SectionHeading } from "./SectionHeading";

export function ServiceAreaChecker({ popularAreas }: { popularAreas: ServiceArea[] }) {
  const router = useRouter();
  const setLocation = useBookingStore((s) => s.setLocation);
  const [query, setQuery] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ServiceAreaCheckResult | null>(null);
  const [inputError, setInputError] = useState<string>();

  const check = async (value: string) => {
    if (!value.trim()) {
      setResult(null);
      setInputError("Enter your area or 6-digit pincode.");
      return;
    }
    setInputError(undefined);
    setChecking(true);
    try {
      setResult(await locationService.checkServiceArea(value));
    } catch (error) {
      setInputError(getErrorMessage(error));
    } finally {
      setChecking(false);
    }
  };

  const bookHere = (area: ServiceArea) => {
    setLocation(locationService.toBookingLocation(area));
    router.push("/book/vendors");
  };

  return (
    <section id="service-area" aria-labelledby="service-area-title" className="scroll-mt-20 py-20 lg:py-28">
      <Container>
        <div className="grid gap-10 rounded-[36px] border border-line bg-white p-6 shadow-card sm:p-10 lg:grid-cols-2 lg:gap-16 lg:p-14">
          <SectionHeading
            id="service-area-title"
            eyebrow="Service area"
            title="Do we pick up in your area?"
            description="Check coverage before you book. We're live across South, Central and suburban Mumbai, and expanding every month."
          />

          <div>
            <form
              noValidate
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void check(query);
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-start"
            >
              <LocationInput
                label="Your area or pincode"
                hideLabel
                value={query}
                onChange={(value) => {
                  setQuery(value);
                  setInputError(undefined);
                }}
                onSelectArea={(area) => void check(area.name)}
                onSubmit={() => void check(query)}
                error={inputError}
                className="flex-1"
              />
              <Button type="submit" size="lg" loading={checking} loadingText="Checking">
                Check area
              </Button>
            </form>

            {!result && (
              <div className="mt-5">
                <p className="text-sm text-ink-500">Popular areas</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {popularAreas.map((area) => (
                    <li key={area.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery(area.name);
                          void check(area.name);
                        }}
                        className="rounded-full border border-line bg-canvas px-3.5 py-1.5 text-sm font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                      >
                        {area.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div aria-live="polite" className="mt-6">
              {result && !checking && (
                <CheckResult
                  key={JSON.stringify(result)}
                  result={result}
                  onBook={bookHere}
                  onPickSuggestion={(area) => {
                    setQuery(area.name);
                    void check(area.name);
                  }}
                  onReset={() => {
                    setResult(null);
                    setQuery("");
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

interface CheckResultProps {
  result: ServiceAreaCheckResult;
  onBook: (area: ServiceArea) => void;
  onPickSuggestion: (area: ServiceArea) => void;
  onReset: () => void;
}

function CheckResult({ result, onBook, onPickSuggestion, onReset }: CheckResultProps) {
  // We map the area, but no partner covers it yet: that's "coming soon", not "fully booked".
  if (result.status === "supported" && !result.hasPartners) {
    return (
      <CheckResult
        result={{ status: "coming_soon", query: result.area.name, area: result.area, reason: "area_not_covered" }}
        onBook={onBook}
        onPickSuggestion={onPickSuggestion}
        onReset={onReset}
      />
    );
  }

  if (result.status === "supported") {
    return (
      <div className="animate-fade-up rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex gap-3">
          <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="font-bold text-ink-900">Great news — we pick up in {result.area.name}.</p>
            <p className="mt-1 text-[15px] text-ink-600">
              {result.partnerCount > 0
                ? `${pluralize(result.partnerCount, "laundry partner")} available near you right now.`
                : "Our partners nearby are fully booked at the moment, but you can still check for openings."}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 pl-9">
          <Button onClick={() => onBook(result.area)} trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />}>
            Book a pickup in {result.area.name}
          </Button>
          <Button variant="ghost" onClick={onReset}>
            Check another area
          </Button>
        </div>
      </div>
    );
  }

  if (result.status === "coming_soon") {
    const place = result.area?.name ?? result.query;
    return (
      <div className="animate-fade-up rounded-3xl border border-sun-100 bg-sun-50 p-5">
        <div className="flex gap-3">
          <MapPinOff className="mt-0.5 size-6 shrink-0 text-sun-700" aria-hidden="true" />
          <div>
            <p className="font-bold text-ink-900">We&apos;re coming soon to {place}.</p>
            <p className="mt-1 text-[15px] text-ink-600">
              {result.reason === "outside_city"
                ? "We currently serve Mumbai only, and nearby cities are next on our list."
                : "We don't have a laundry partner in this area yet, but we're onboarding new partners every month."}
            </p>
          </div>
        </div>
        <AreaWaitlistForm place={place} className="mt-4 pl-9" />
        <button type="button" onClick={onReset} className="mt-3 pl-9 text-sm font-semibold text-ink-600 underline underline-offset-4 hover:text-ink-900">
          Check a different area
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-up rounded-3xl border border-line bg-canvas p-5">
      <div className="flex gap-3">
        <SearchX className="mt-0.5 size-6 shrink-0 text-ink-500" aria-hidden="true" />
        <div>
          <p className="font-bold text-ink-900">We couldn&apos;t find &ldquo;{result.query}&rdquo;.</p>
          <p className="mt-1 text-[15px] text-ink-600">Try a neighbourhood name or a 6-digit pincode, or pick one of these:</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-2 pl-9">
        {result.suggestions.map((area) => (
          <li key={area.id}>
            <button
              type="button"
              onClick={() => onPickSuggestion(area)}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-700 hover:border-brand-300 hover:text-brand-800"
            >
              {area.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
