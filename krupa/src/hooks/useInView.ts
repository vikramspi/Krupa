"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * True once the element has been scrolled into view, and true from then on —
 * entrance animations should play once, not every time you scroll past.
 *
 * Returns true immediately when IntersectionObserver is unavailable, so the
 * content is never left hidden waiting for an event that can't fire.
 */
export function useInView(ref: RefObject<Element | null>, rootMargin = "-10% 0px"): boolean {
  const [inView, setInView] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || seen.current) return;

    const reveal = () => {
      seen.current = true;
      setInView(true);
    };

    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(reveal);
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          reveal();
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);

    /**
     * Safety net. An observer that never fires — a backgrounded or unrendered
     * document, an occluded tab — must not leave a section stuck at opacity 0,
     * so reveal unconditionally after a short wait. The animation may then play
     * unseen, which is a far better failure than invisible content.
     */
    const fallback = setTimeout(() => {
      reveal();
      observer.disconnect();
    }, 2500);

    return () => {
      clearTimeout(fallback);
      observer.disconnect();
    };
  }, [ref, rootMargin]);

  return inView;
}
