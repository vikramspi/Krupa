"use client";

import { MapPin } from "lucide-react";

/**
 * A pin sending rings out across the city, under "do we pick up in your area?".
 *
 * Purely decorative — it illustrates the question rather than reporting any
 * real coverage, so it is hidden from assistive tech. The rings are three
 * copies of one keyframe on a stagger, which reads as a continuous sweep
 * without needing a timer or any state.
 */
export function CoverageRadar() {
  return (
    <div aria-hidden="true" className="relative mt-8 hidden h-32 select-none lg:block">
      {/* A suggestion of streets, well below the rings. */}
      <svg viewBox="0 0 320 128" className="absolute inset-0 size-full" fill="none">
        <g className="stroke-ink-100" strokeWidth="1.5">
          <path d="M0 96 L320 72" />
          <path d="M0 40 L320 56" />
          <path d="M72 0 L96 128" />
          <path d="M210 0 L190 128" />
        </g>
        <g className="fill-ink-100">
          <rect x="24" y="46" width="34" height="26" rx="3" />
          <rect x="116" y="18" width="42" height="30" rx="3" />
          <rect x="236" y="74" width="38" height="28" rx="3" />
        </g>
      </svg>

      <div className="absolute left-[46%] top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex size-11 items-center justify-center">
          {[0, 800, 1600].map((delay) => (
            <span
              key={delay}
              className="radar-ring absolute inset-0 rounded-full border-2 border-brand-400"
              style={{ ["--radar-delay" as string]: `${delay}ms` }}
            />
          ))}
          <span className="relative flex size-8 items-center justify-center rounded-full bg-brand-600 shadow-card">
            <MapPin className="size-4 text-white" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    </div>
  );
}
