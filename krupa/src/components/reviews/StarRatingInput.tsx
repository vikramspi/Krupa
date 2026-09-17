"use client";

import { Star } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";

const LABELS = ["Poor", "Below average", "Okay", "Good", "Excellent"];

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  legend: string;
  error?: string;
}

/**
 * Five native radio buttons drawn as stars: arrow keys, screen readers and form
 * semantics all work without extra code.
 */
export function StarRatingInput({ value, onChange, legend, error }: StarRatingInputProps) {
  const name = useId();
  const errorId = `${name}-error`;
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className="text-sm font-semibold text-ink-800">{legend}</legend>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {LABELS.map((label, index) => {
            const star = index + 1;
            return (
              <label
                key={star}
                className="group relative cursor-pointer p-1 has-[:focus-visible]:rounded-lg has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600"
                onMouseEnter={() => setHover(star)}
              >
                <input
                  type="radio"
                  name={name}
                  value={star}
                  checked={value === star}
                  onChange={() => onChange(star)}
                  className="sr-only"
                />
                <span className="sr-only">
                  {star} {star === 1 ? "star" : "stars"} — {label}
                </span>
                <Star
                  aria-hidden="true"
                  className={cn("size-8 transition-colors", star <= shown ? "text-sun-400" : "text-ink-200")}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </label>
            );
          })}
        </div>
        <span className="min-w-24 text-sm font-medium text-ink-600" aria-hidden="true">
          {shown ? LABELS[shown - 1] : ""}
        </span>
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
