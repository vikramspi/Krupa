"use client";

import { ChevronDown } from "lucide-react";
import { forwardRef, useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldControlClasses } from "./Input";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hideLabel?: boolean;
  options?: SelectOption[];
  groups?: SelectOptionGroup[];
  placeholder?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hideLabel, options = [], groups, placeholder, error, hint, containerClassName, className, id: idProp, ...props },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={containerClassName}>
      <label htmlFor={id} className={cn("mb-1.5 block text-sm font-semibold text-ink-800", hideLabel && "sr-only")}>
        {label}
      </label>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(fieldControlClasses(!!error), "h-12 appearance-none pl-4 pr-11", className)}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.label}
            </option>
          ))}
          {groups?.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
