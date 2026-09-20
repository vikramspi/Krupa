"use client";

import { useEffect, useRef } from "react";
import { useInView } from "@/hooks/useInView";

/**
 * Counts from zero up to `value` the first time it scrolls into view.
 *
 * The real number is what renders on the server, what stays there if JS never
 * runs, and what shows immediately when motion is reduced — the tick is
 * decoration on top of a figure that is always correct. Nothing ever resets the
 * digits to zero outside the running animation, so a frame loop that never gets
 * to run leaves the true count on screen rather than a stuck "0".
 *
 * The digits are written straight to the DOM rather than through state so the
 * count doesn't re-render the section sixty times a second.
 */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref);

  useEffect(() => {
    const element = ref.current;
    if (!element || !inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease out, so it slows into the final number rather than snapping.
      element.textContent = String(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      element.textContent = String(value);
    };
  }, [inView, value, duration]);

  return <span ref={ref}>{value}</span>;
}
