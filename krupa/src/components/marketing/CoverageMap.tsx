"use client";

import { Clock, MapPin, Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { RatingStars } from "@/components/ui/RatingStars";
import { MAP_HEIGHT, MAP_WIDTH, MUMBAI_LANDMASS, MUMBAI_WARDS, projectToMap } from "@/data/mumbaiMap";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import { pluralize } from "@/lib/format";
import type { CoveragePartner, ServiceArea } from "@/types";
import { SectionHeading } from "./SectionHeading";

interface CoverageMapProps {
  areas: ServiceArea[];
  partners: CoveragePartner[];
  serviceNames: Record<string, string>;
}

interface Pin {
  partner: CoveragePartner;
  x: number;
  y: number;
  /** Neighbourhoods this partner collects from, resolved and sorted. */
  areaNames: string[];
}

/** Pins any closer than this overlap illegibly, so we spread them apart. */
const MIN_PIN_GAP = 26;
/** How long each partner holds the panel while the tour plays. */
const TOUR_STEP_MS = 4200;
/** A beat on the zone summary before the tour starts, so it isn't missed. */
const TOUR_START_DELAY_MS = 2200;

/**
 * Places each partner at the centre of the neighbourhoods it collects from —
 * never at its own address, which we deliberately don't publish. Partners whose
 * centres collide are nudged apart in a spiral so every pin stays clickable.
 */
function buildPins(partners: CoveragePartner[], areas: ServiceArea[]): Pin[] {
  const byId = new Map(areas.map((area) => [area.id, area]));
  const placed: Pin[] = [];

  for (const partner of partners) {
    const covered = partner.coverageAreaIds.map((id) => byId.get(id)).filter((a): a is ServiceArea => !!a);
    if (covered.length === 0) continue;

    const lat = covered.reduce((sum, a) => sum + a.coordinates.lat, 0) / covered.length;
    const lng = covered.reduce((sum, a) => sum + a.coordinates.lng, 0) / covered.length;
    const origin = projectToMap(lat, lng);
    let { x, y } = origin;

    for (let turn = 1; turn < 40; turn++) {
      if (!placed.some((p) => Math.hypot(p.x - x, p.y - y) < MIN_PIN_GAP)) break;
      const angle = turn * 2.4; // ~137°, so successive nudges fan out evenly
      const radius = MIN_PIN_GAP * (0.8 + turn * 0.14);
      x = origin.x + Math.cos(angle) * radius;
      y = origin.y + Math.sin(angle) * radius;
    }

    placed.push({
      partner,
      x,
      y,
      areaNames: covered.map((a) => a.name).sort((a, b) => a.localeCompare(b)),
    });
  }
  return placed;
}

export function CoverageMap({ areas, partners, serviceNames }: CoverageMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [touring, setTouring] = useState(true);
  const [paused, setPaused] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef);
  const reducedMotion = usePrefersReducedMotion();

  const pins = useMemo(() => buildPins(partners, areas), [partners, areas]);
  const selected = pins.find((pin) => pin.partner.id === selectedId) ?? null;

  /**
   * The tour: each partner takes the panel in turn, so the network introduces
   * itself without anyone having to click. It runs only while the section is on
   * screen, stops for good once a visitor takes over, and never starts at all
   * when motion is reduced.
   */
  const tourRunning = touring && !paused && inView && !reducedMotion && pins.length > 1;
  const stepRef = useRef(-1);

  useEffect(() => {
    if (!tourRunning) return;
    const advance = () => {
      stepRef.current = (stepRef.current + 1) % pins.length;
      setSelectedId(pins[stepRef.current].partner.id);
    };
    const first = setTimeout(advance, stepRef.current < 0 ? TOUR_START_DELAY_MS : TOUR_STEP_MS);
    const timer = setInterval(advance, TOUR_STEP_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [tourRunning, pins]);

  /** Neighbourhoods anyone collects from, and the ones currently spotlit. */
  const servedAreaIds = useMemo(
    () => new Set(partners.flatMap((partner) => partner.coverageAreaIds)),
    [partners],
  );
  const spotlit = selectedId ?? hoveredId;
  const activeAreaIds = useMemo(() => {
    const partner = partners.find((p) => p.id === spotlit);
    return new Set(partner?.coverageAreaIds ?? []);
  }, [partners, spotlit]);

  /** A visitor touching the map owns it from then on. */
  const takeOver = (id: string | null) => {
    setTouring(false);
    setSelectedId(id);
  };

  const zones = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, { areas: ServiceArea[]; partners: Set<string> }>();
    for (const area of areas) {
      if (!map.has(area.zone)) {
        map.set(area.zone, { areas: [], partners: new Set() });
        order.push(area.zone);
      }
      map.get(area.zone)!.areas.push(area);
    }
    for (const partner of partners) {
      for (const id of partner.coverageAreaIds) {
        const zone = areas.find((a) => a.id === id)?.zone;
        if (zone) map.get(zone)?.partners.add(partner.id);
      }
    }
    return order.map((zone) => ({ zone, ...map.get(zone)! }));
  }, [areas, partners]);

  return (
    <section id="coverage" aria-labelledby="coverage-title" className="scroll-mt-20 bg-white py-20 lg:py-28">
      <Container>
        <SectionHeading
          id="coverage-title"
          eyebrow="Coverage"
          title="Who collects where"
          description="Mumbai's 24 municipal wards. The shaded ones are where we collect — pick a partner to light up the wards they cover."
        />

        <div ref={sectionRef} className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,360px)_1fr] lg:gap-14">
          {/* ── The map ──────────────────────────────────────────────── */}
          <div className="mx-auto w-full max-w-[360px] lg:mx-0">
            <div className="relative w-full" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="absolute inset-0 size-full overflow-visible"
                aria-hidden="true"
              >
                <defs>
                  <clipPath id="mumbai-land">
                    {MUMBAI_LANDMASS.map((d) => (
                      <path key={d.slice(0, 24)} d={d} />
                    ))}
                  </clipPath>
                </defs>

                {/* Sea under everything, so wards read as land. */}
                {MUMBAI_LANDMASS.map((d) => (
                  <path key={d.slice(0, 24)} d={d} className="fill-ink-50" />
                ))}

                {/* Mumbai's 24 municipal wards, tinted by whether we collect
                    there and lit up for whichever partner has the panel. */}
                <g clipPath="url(#mumbai-land)" stroke="white" strokeWidth={1.2} strokeLinejoin="round">
                  {MUMBAI_WARDS.map((ward) => {
                    const covered = ward.areaIds.some((id) => servedAreaIds.has(id));
                    const active = ward.areaIds.some((id) => activeAreaIds.has(id));
                    return (
                      <path
                        key={ward.name}
                        d={ward.d}
                        className={cn(
                          "transition-[fill] duration-500",
                          active ? "fill-sun-300" : covered ? "fill-brand-200" : "fill-ink-100",
                        )}
                      >
                        <title>{ward.name}</title>
                      </path>
                    );
                  })}
                </g>

                {/* Coastline over the top, to keep the city's edge crisp. */}
                {MUMBAI_LANDMASS.map((d) => (
                  <path
                    key={d.slice(0, 24)}
                    d={d}
                    fill="none"
                    className="stroke-ink-400"
                    strokeWidth={1.4}
                    strokeLinejoin="round"
                  />
                ))}

                {areas.map((area) => {
                  const { x, y } = projectToMap(area.coordinates.lat, area.coordinates.lng);
                  return <circle key={area.id} cx={x} cy={y} r={1.6} className="fill-ink-500/60" />;
                })}
              </svg>

              {pins.map((pin, index) => {
                const isSelected = pin.partner.id === selectedId;
                const isHovered = pin.partner.id === hoveredId;
                return (
                  <button
                    key={pin.partner.id}
                    type="button"
                    onClick={() => takeOver(isSelected ? null : pin.partner.id)}
                    onMouseEnter={() => setHoveredId(pin.partner.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onFocus={() => setHoveredId(pin.partner.id)}
                    onBlur={() => setHoveredId(null)}
                    aria-pressed={isSelected}
                    aria-controls="coverage-panel"
                    className={cn(
                      // Anchored at the tip, and scaled from it, so the point
                      // stays on the neighbourhood it marks.
                      "map-pin absolute -translate-x-1/2 -translate-y-full origin-bottom",
                      isSelected
                        ? "z-20 scale-125 text-sun-500"
                        : isHovered
                          ? "z-10 scale-110 text-brand-500"
                          : !pin.partner.isActive
                            ? "text-ink-500"
                            : "text-brand-600",
                    )}
                    data-shown={inView ? "" : undefined}
                    style={{
                      left: `${(pin.x / MAP_WIDTH) * 100}%`,
                      top: `${(pin.y / MAP_HEIGHT) * 100}%`,
                      ["--pin-delay" as string]: `${index * 70}ms`,
                    }}
                  >
                    <svg viewBox="0 0 24 34" className="size-7 drop-shadow-[0_2px_2px_rgb(15_28_46/0.35)]" aria-hidden="true">
                      <path
                        d="M12 0.8C5.9 0.8 0.9 5.8 0.9 11.9c0 7.9 11.1 21.3 11.1 21.3s11.1-13.4 11.1-21.3C23.1 5.8 18.1 0.8 12 0.8z"
                        fill="currentColor"
                        stroke="white"
                        strokeWidth={1.5}
                      />
                      <circle cx="12" cy="11.9" r="4" className="fill-white" />
                    </svg>
                    <span className="sr-only">
                      {pin.partner.name}, collects from {pin.areaNames.join(", ")}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4 font-mono text-[12px] leading-relaxed text-ink-400">
              Pins sit on the neighbourhoods a partner collects from, not their shopfront.
              <br />
              Boundaries © OpenStreetMap contributors
            </p>
          </div>

          {/* ── The panel beside it ──────────────────────────────────── */}
          <div>
            <div
              id="coverage-panel"
              /* While the tour is driving, announcements would fire every few
                 seconds unprompted; once a visitor is steering, they're wanted. */
              aria-live={tourRunning ? "off" : "polite"}
              className="lg:min-h-[27rem]"
            >
              {selected ? (
                <PartnerDetail
                  pin={selected}
                  serviceNames={serviceNames}
                  onClose={() => takeOver(null)}
                  progress={tourRunning}
                />
              ) : (
                <dl className="grid gap-x-10 gap-y-5 border-t border-line pt-6 sm:grid-cols-2">
                  {zones.map(({ zone, areas: zoneAreas, partners: zonePartners }) => (
                    <div key={zone}>
                      <dt className="font-semibold text-ink-900">{zone}</dt>
                      <dd className="mt-1 font-mono text-[13px] text-ink-500">
                        {pluralize(zoneAreas.length, "neighbourhood")}
                        {zonePartners.size > 0 && <>, {pluralize(zonePartners.size, "partner")}</>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {pins.length > 0 ? (
              <>
                <div className="mt-10 flex items-baseline justify-between gap-4">
                  <h3 className="font-mono text-[13px] text-ink-500">Laundry partners</h3>
                  {!reducedMotion && pins.length > 1 && touring && (
                    <button
                      type="button"
                      onClick={() => setPaused((p) => !p)}
                      className="-mr-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[13px] text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                    >
                      {paused ? (
                        <Play className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Pause className="size-3.5" aria-hidden="true" />
                      )}
                      {paused ? "Play tour" : "Pause tour"}
                    </button>
                  )}
                </div>
                <ul className="mt-3 border-t border-line">
                  {pins.map((pin) => (
                    <li key={pin.partner.id}>
                      <button
                        type="button"
                        onClick={() => takeOver(pin.partner.id)}
                        onMouseEnter={() => setHoveredId(pin.partner.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        aria-controls="coverage-panel"
                        className={cn(
                          "flex w-full items-baseline gap-3 border-b border-line py-3 text-left transition-colors hover:bg-brand-50/60",
                          pin.partner.id === selectedId && "bg-brand-50",
                        )}
                      >
                        <span className="font-medium text-ink-900">{pin.partner.name}</span>
                        <span className="leader" aria-hidden="true" />
                        <span className="shrink-0 font-mono text-[13px] text-ink-500">{pin.areaNames.length} areas</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-8 max-w-md text-[15px] leading-relaxed text-ink-600">
                We&apos;re signing up laundry partners across these neighbourhoods right now. Check your area below and
                we&apos;ll tell you the moment we reach you.
              </p>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

function PartnerDetail({
  pin,
  serviceNames,
  onClose,
  progress,
}: {
  pin: Pin;
  serviceNames: Record<string, string>;
  onClose: () => void;
  progress: boolean;
}) {
  const { partner } = pin;
  return (
    <div className="border border-line bg-canvas p-6 shadow-card">
      {/* How long this partner holds the panel before the tour moves on. */}
      {progress && (
        <div className="-mx-6 -mt-6 mb-6 h-0.5 overflow-hidden bg-line" aria-hidden="true">
          <div key={partner.id} className="tour-progress h-full bg-brand-500" />
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-ink-900">{partner.name}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {partner.rating !== null ? (
              <>
                <RatingStars rating={partner.rating} />
                <span className="font-mono text-[13px] text-ink-500">
                  {partner.rating}
                  {partner.reviewCount > 0 && ` (${pluralize(partner.reviewCount, "review")})`}
                </span>
              </>
            ) : (
              <span className="font-mono text-[13px] text-ink-400">No reviews yet</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close partner details"
          className="-mr-2 -mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <dl className="mt-5 border-t border-line">
        <div className="ledger-row flex items-baseline py-3">
          <dt className="flex items-center gap-2 text-[15px] text-ink-700">
            <Clock className="size-4 text-ink-400" aria-hidden="true" />
            Turnaround
          </dt>
          <span className="leader" aria-hidden="true" />
          <dd className="font-mono text-[15px] text-ink-900">
            {partner.turnaroundHours.min}–{partner.turnaroundHours.max} hrs
          </dd>
        </div>
        <div className="ledger-row flex items-baseline py-3">
          <dt className="flex items-center gap-2 text-[15px] text-ink-700">
            <MapPin className="size-4 text-ink-400" aria-hidden="true" />
            Collects from
          </dt>
          <span className="leader" aria-hidden="true" />
          <dd className="font-mono text-[15px] text-ink-900">{pin.areaNames.length} areas</dd>
        </div>
      </dl>

      <p className="mt-4 text-[15px] leading-relaxed text-ink-600">{pin.areaNames.join(", ")}</p>

      {partner.services.length > 0 && (
        <>
          <h4 className="mt-6 font-mono text-[13px] text-ink-500">Cleans</h4>
          <ul className="mt-2 flex flex-wrap gap-2">
            {partner.services.map((id) => (
              <li key={id} className="rounded-sm border border-line bg-white px-2.5 py-1 text-sm text-ink-700">
                {serviceNames[id] ?? id}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <ButtonLink href="/book">Book a pickup</ButtonLink>
        {partner.isActive ? (
          partner.acceptsSameDay && (
            <span className="font-mono text-[13px] text-brand-700">Same-day pickup available</span>
          )
        ) : (
          <span className="font-mono text-[13px] text-ink-500">At capacity right now</span>
        )}
      </div>
    </div>
  );
}
