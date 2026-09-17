"use client";

import { useRef, type KeyboardEvent } from "react";
import { ServiceIcon, categoryIconKey } from "@/components/ui/ServiceIcon";
import { cn } from "@/lib/cn";
import type { ServiceCategory, ServiceCategoryInfo } from "@/types";

export const categoryTabId = (id: ServiceCategory) => `category-tab-${id}`;
export const categoryPanelId = (id: ServiceCategory) => `category-panel-${id}`;

interface ServiceCategoryTabsProps {
  categories: ServiceCategoryInfo[];
  active: ServiceCategory;
  onChange: (id: ServiceCategory) => void;
  /** Number of selected pieces per category, shown as a count bubble. */
  selectedCounts: Partial<Record<ServiceCategory, number>>;
}

/** WAI-ARIA tabs with roving tabindex and arrow-key navigation. */
export function ServiceCategoryTabs({ categories, active, onChange, selectedCounts }: ServiceCategoryTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = categories.length - 1;
    const target =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    onChange(categories[target].id);
    tabRefs.current[target]?.focus();
  };

  return (
    <div role="tablist" aria-label="Laundry categories" className="grid grid-cols-3 gap-1.5 rounded-2xl bg-ink-100 p-1.5">
      {categories.map((category, index) => {
        const selected = category.id === active;
        const count = selectedCounts[category.id] ?? 0;
        return (
          <button
            key={category.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            id={categoryTabId(category.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={categoryPanelId(category.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(category.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-[13px] font-semibold leading-tight transition-[background-color,color,box-shadow] sm:flex-row sm:gap-2 sm:text-sm",
              selected ? "bg-white text-ink-900 shadow-card" : "text-ink-600 hover:text-ink-900",
            )}
          >
            <ServiceIcon icon={categoryIconKey[category.id]} className={cn("size-4", selected ? "text-brand-600" : "text-ink-400")} />
            <span>{category.label}</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white sm:static sm:ml-0.5">
                {count}
                <span className="sr-only"> selected</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
