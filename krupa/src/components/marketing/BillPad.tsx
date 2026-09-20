"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "@/hooks/useInView";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";

export interface BillItem {
  name: string;
  price: number;
}

/**
 * Example bills, deliberately of different lengths so the sheet that tears off
 * is a different size each time round. Items are looked up in the real price
 * list, so every figure on the pad is a price we actually charge.
 */
const BILLS: { code: string; pickup: string; lines: { id: string; quantity: number }[] }[] = [
  {
    code: "KR-10284",
    pickup: "Today, 11:00 AM",
    lines: [
      { id: "shirt", quantity: 6 },
      { id: "trousers", quantity: 3 },
      { id: "blazer", quantity: 1 },
    ],
  },
  {
    code: "KR-10291",
    pickup: "Today, 6:30 PM",
    lines: [
      { id: "bedsheet-double", quantity: 2 },
      { id: "pillow-cover", quantity: 4 },
    ],
  },
  {
    code: "KR-10306",
    pickup: "Tomorrow, 9:00 AM",
    lines: [
      { id: "tshirt", quantity: 4 },
      { id: "jeans", quantity: 2 },
      { id: "kurta", quantity: 3 },
      { id: "towel", quantity: 4 },
      { id: "press-only", quantity: 5 },
    ],
  },
  {
    code: "KR-10312",
    pickup: "Tomorrow, 1:00 PM",
    lines: [
      { id: "shirt", quantity: 5 },
      { id: "nightwear", quantity: 2 },
      { id: "curtain", quantity: 2 },
      { id: "blanket-single", quantity: 1 },
    ],
  },
];

/** Long enough to read the finished bill before it's torn off. */
const LINE_STEP_MS = 420;
const FIRST_LINE_MS = 500;
const HOLD_MS = 1900;
const TEAR_MS = 850;

/**
 * The counter's spiral pad: a bill is written out line by line, held up, then
 * torn off downwards — and the next one starts on the fresh sheet underneath.
 *
 * Decorative, so the whole thing is hidden from assistive tech. The lines type
 * themselves in CSS, which means the first bill still writes out with no
 * JavaScript at all; only the tear-and-refill loop needs a timer, and that loop
 * never starts when motion is reduced or while the pad is off screen.
 */
export function BillPad({ catalog }: { catalog: Record<string, BillItem> }) {
  const [index, setIndex] = useState(0);
  const [tearing, setTearing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, "0px");
  const reducedMotion = usePrefersReducedMotion();

  const looping = inView && !reducedMotion;

  useEffect(() => {
    if (!looping) return;
    const lineCount = BILLS[index].lines.length;
    const written = FIRST_LINE_MS + lineCount * LINE_STEP_MS + HOLD_MS;
    const tear = setTimeout(() => setTearing(true), written);
    const next = setTimeout(() => {
      setTearing(false);
      setIndex((i) => (i + 1) % BILLS.length);
    }, written + TEAR_MS);
    return () => {
      clearTimeout(tear);
      clearTimeout(next);
    };
  }, [looping, index]);

  const bill = BILLS[index];
  const lines = bill.lines
    .map((line) => ({ ...line, item: catalog[line.id] }))
    .filter((line): line is typeof line & { item: BillItem } => !!line.item);
  const total = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);

  return (
    <div className="mx-auto w-full max-w-sm lg:ml-auto lg:mr-0" aria-hidden="true">
      <div ref={ref} className="relative pt-3">
        {/* The pad itself: blank sheets that follow the live bill's height, so
            they peek out by a few millimetres whatever length it is. */}
        <div className="relative">
          <span className="absolute inset-x-2 -bottom-2 top-2 rounded-r-lg border border-line bg-white/70" />
          <span className="absolute inset-x-1 -bottom-1 top-1 rounded-r-lg border border-line bg-white/85" />

          {/* One sheet size, always. A short bill just leaves more blank paper
              below it — the pad must never resize under the hero. */}
          <div
            key={index}
            className={cn(
              "ticket relative flex h-[27rem] flex-col rounded-r-lg px-6 pb-6 pt-9 shadow-raised",
              tearing && "bill-tear",
            )}
          >
            <div className="flex items-baseline justify-between border-b border-dashed border-line pb-4 pl-6">
              <span className="text-sm font-medium text-ink-500">Krupa Laundry</span>
              <span className="font-mono text-lg text-ink-900">{bill.code}</span>
            </div>

            <dl className="flex-1 pl-6">
              {lines.map((line, i) => (
                <div
                  key={line.id}
                  className="bill-line ledger-row flex items-baseline justify-between py-3"
                  style={{ animationDelay: `${FIRST_LINE_MS + i * LINE_STEP_MS}ms` }}
                >
                  <dt className="text-[15px] text-ink-700">{line.item.name}</dt>
                  <dd className="font-mono text-[15px] text-ink-900">
                    {line.quantity} × {formatINR(line.item.price)}
                  </dd>
                </div>
              ))}
            </dl>

            <div
              className="bill-line mt-2 shrink-0 border-t border-dashed border-line pl-6 pt-4"
              style={{ animationDelay: `${FIRST_LINE_MS + lines.length * LINE_STEP_MS}ms` }}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[15px] text-ink-700">Pickup</span>
                <span className="font-mono text-[15px] text-ink-900">{bill.pickup}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-[15px] text-ink-700">Pay on delivery</span>
                <span className="font-mono text-lg text-ink-950">{formatINR(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* The wire binding, straddling the top edge of the pad. */}
        <div className="absolute inset-x-7 top-0 z-20 flex justify-between">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} className="block h-7 w-3 rounded-full border-[1.5px] border-ink-300 bg-canvas/40" />
          ))}
        </div>
      </div>

      <p className="mt-3 text-center text-sm text-ink-400 lg:pl-6 lg:text-left">
        An example ticket — yours arrives by email.
      </p>
    </div>
  );
}
