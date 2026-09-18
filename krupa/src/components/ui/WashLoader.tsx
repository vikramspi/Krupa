"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Krupa's loading mark: a washing drum tumbling clothes, with soap bubbles
 * drifting up. Decorative — the surrounding `role="status"` carries the message,
 * and every animation stops under "reduce motion".
 */
const CLOTHES = [
  // Three garment shapes riding the drum, each starting a third of a turn apart.
  { d: "M-9 -3h7l2 2 2-2h7v7a3 3 0 0 1-3 3h-12a3 3 0 0 1-3-3z", fill: "var(--color-brand-300)", delay: "0s" },
  { d: "M-7 -4h14v6a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z", fill: "var(--color-sun-300)", delay: "-1.4s" },
  { d: "M-6 -5h12v5a6 6 0 0 1-12 0z", fill: "var(--color-brand-100)", delay: "-2.8s" },
];

export function WashLoader({ className, size = 96 }: { className?: string; size?: number }) {
  return (
    <span className={cn("relative inline-flex", className)} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="size-full overflow-visible">
        {/* Machine body */}
        <rect x="14" y="10" width="72" height="80" rx="18" className="fill-brand-600" />
        <rect x="20" y="16" width="60" height="10" rx="5" className="fill-white/15" />
        <circle cx="70" cy="21" r="2.5" className="fill-sun-300" />

        {/* Drum window */}
        <circle cx="50" cy="56" r="25" className="fill-white/10" />
        <circle cx="50" cy="56" r="21" className="fill-white" />

        <g clipPath="url(#wash-drum)">
          <g className="wash-drum">
            {CLOTHES.map((cloth, i) => (
              <g key={i} className="wash-cloth" style={{ animationDelay: cloth.delay }}>
                <path d={cloth.d} fill={cloth.fill} transform="translate(50 44)" />
              </g>
            ))}
          </g>
          {/* Water line sloshing at the bottom of the drum */}
          <path className="wash-water" d="M27 66q7 -4 12 0t12 0t12 0t12 0v14H27z" fill="var(--color-brand-200)" opacity="0.65" />
        </g>

        <circle cx="50" cy="56" r="21" fill="none" stroke="var(--color-brand-700)" strokeWidth="3" />

        {/* Soap bubbles drifting up either side of the machine, drawn last so they stay visible */}
        {[
          { cx: 8, cy: 78, r: 4, delay: "0s" },
          { cx: 93, cy: 84, r: 3, delay: "-1.2s" },
          { cx: 4, cy: 88, r: 2.5, delay: "-2.4s" },
          { cx: 96, cy: 72, r: 3.5, delay: "-3.2s" },
        ].map((b, i) => (
          <circle key={i} className="wash-bubble" cx={b.cx} cy={b.cy} r={b.r} style={{ animationDelay: b.delay }} />
        ))}
        <defs>
          <clipPath id="wash-drum">
            <circle cx="50" cy="56" r="21" />
          </clipPath>
        </defs>
      </svg>
    </span>
  );
}

const MESSAGES = ["Sorting the colours…", "Checking pockets…", "Warming the water…", "Almost there…"];

/** Cycles playful lines so a slow connection still feels alive. */
export function WashLoaderMessages({ interval = 2600 }: { interval?: number }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return <span>{MESSAGES[index]}</span>;
}
