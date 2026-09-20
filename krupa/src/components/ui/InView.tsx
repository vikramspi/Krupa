"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useInView } from "@/hooks/useInView";

/**
 * Marks its subtree with `data-in-view` the first time it scrolls into view, so
 * entrance animations can be written in CSS and play once.
 *
 * The content is fully rendered and readable either way — the attribute only
 * triggers motion, never visibility, so nothing is hidden if JS never runs.
 */
export function InView({
  as: Tag = "div",
  className,
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <Tag ref={ref} className={className} data-in-view={inView ? "" : undefined}>
      {children}
    </Tag>
  );
}
