"use client";

import { MapPin, Search } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";
import { locationService } from "@/services";
import type { ServiceArea } from "@/types";

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the customer picks a suggestion. */
  onSelectArea: (area: ServiceArea) => void;
  /** Called on Enter with no suggestion highlighted. */
  onSubmit?: () => void;
  label: string;
  hideLabel?: boolean;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Area / pincode search with typeahead suggestions.
 * Implements the ARIA 1.2 combobox pattern (listbox popup, aria-activedescendant).
 */
export function LocationInput({
  value,
  onChange,
  onSelectArea,
  onSubmit,
  label,
  hideLabel,
  placeholder = "Area, locality or pincode",
  error,
  disabled,
  autoFocus,
  className,
}: LocationInputProps) {
  const inputId = useId();
  const listboxId = useId();
  const errorId = useId();
  const [results, setResults] = useState<{ query: string; areas: ServiceArea[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const query = value.trim();

  useEffect(() => {
    if (query.length < 2) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      locationService.searchAreas(query).then((areas) => {
        if (!cancelled) setResults({ query, areas });
      });
    }, 160);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const suggestions = query.length >= 2 && results?.query === query ? results.areas : [];
  const searching = query.length >= 2 && results?.query !== query;
  const showList = open && query.length >= 2 && (suggestions.length > 0 || searching);

  const select = (area: ServiceArea) => {
    onChange(area.name);
    setOpen(false);
    setActiveIndex(-1);
    onSelectArea(area);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (suggestions.length ? (i + 1) % suggestions.length : -1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (suggestions.length ? (i <= 0 ? suggestions.length - 1 : i - 1) : -1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (showList && activeIndex >= 0 && suggestions[activeIndex]) select(suggestions[activeIndex]);
      else {
        setOpen(false);
        onSubmit?.();
      }
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <label htmlFor={inputId} className={cn("mb-1.5 block text-sm font-semibold text-ink-800", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-400" aria-hidden="true" />
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-activedescendant={showList && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          enterKeyHint="search"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "block h-14 w-full rounded-2xl border bg-white pl-12 pr-12 text-[16px] font-medium text-ink-900 placeholder:font-normal placeholder:text-ink-400 transition-[border-color,box-shadow] focus:outline-none focus-visible:outline-none focus:ring-4 disabled:bg-ink-50",
            error ? "border-red-400 focus:ring-red-100" : "border-ink-200 hover:border-ink-300 focus:border-brand-500 focus:ring-brand-100",
          )}
        />
        {searching && open && <Spinner className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-400" />}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <ul
        id={listboxId}
        role="listbox"
        aria-label="Matching areas"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-raised"
      >
        {searching && suggestions.length === 0 ? (
          <li className="px-3 py-3 text-sm text-ink-500" role="presentation">
            Searching areas…
          </li>
        ) : (
          suggestions.map((area, index) => (
            <li
              key={area.id}
              id={`${listboxId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(area)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5",
                index === activeIndex ? "bg-brand-50" : "hover:bg-ink-50",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500" aria-hidden="true">
                <MapPin className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-ink-900">{area.name}</span>
                <span className="block truncate text-sm text-ink-500">
                  {area.zone} · {area.pincodes.slice(0, 2).join(", ")}
                </span>
              </span>
              {area.coverage === "coming_soon" && <Badge tone="sun">Coming soon</Badge>}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
