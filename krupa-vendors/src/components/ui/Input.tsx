"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldShellProps {
  id: string;
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}

function FieldShell({ id, label, hideLabel, hint, error, optional, className, children }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className={cn("mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink-800", hideLabel && "sr-only")}>
        <span>{label}</span>
        {optional && <span className="text-xs font-medium text-ink-400">Optional</span>}
      </label>
      {children}
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
}

export const fieldControlClasses = (hasError: boolean) =>
  cn(
    "block w-full rounded-2xl border bg-white text-[16px] text-ink-900 placeholder:text-ink-400 transition-[border-color,box-shadow] duration-150 focus:outline-none focus-visible:outline-none focus:ring-4 disabled:bg-ink-50 disabled:text-ink-500",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-100"
      : "border-ink-200 hover:border-ink-300 focus:border-brand-500 focus:ring-brand-100",
  );

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label: string;
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  optional?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hideLabel, hint, error, optional, prefix, suffix, containerClassName, className, id: idProp, ...props },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <FieldShell id={id} label={label} hideLabel={hideLabel} hint={hint} error={error} optional={optional} className={containerClassName}>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-500">{prefix}</span>
        )}
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={props.required}
          className={cn(
            fieldControlClasses(!!error),
            "h-12",
            // Callers with a wider prefix (e.g. "+91") pass their own left padding.
            /\bpl-/.test(className ?? "") ? null : prefix ? "pl-11" : "pl-4",
            suffix ? "pr-12" : "pr-4",
            className,
          )}
          {...props}
        />
        {suffix && <span className="absolute inset-y-0 right-0 flex items-center pr-2">{suffix}</span>}
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, optional, containerClassName, className, id: idProp, ...props },
  ref,
) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(fieldControlClasses(!!error), "min-h-24 px-4 py-3", className)}
        {...props}
      />
    </FieldShell>
  );
});
