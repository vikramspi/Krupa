import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./LoadingState";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "dark" | "danger" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

interface StyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none",
  secondary: "bg-brand-50 text-brand-800 hover:bg-brand-100 active:bg-brand-200 disabled:bg-ink-100 disabled:text-ink-400",
  outline:
    "border border-ink-200 bg-white text-ink-900 hover:border-ink-300 hover:bg-ink-50 active:bg-ink-100 disabled:text-ink-400 disabled:hover:bg-white",
  ghost: "text-ink-700 hover:bg-ink-100 hover:text-ink-900 active:bg-ink-200 disabled:text-ink-400",
  dark: "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 disabled:bg-ink-300",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50 active:bg-red-100 disabled:text-ink-400",
  /** For use on dark or brand-coloured surfaces. */
  inverse: "bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20 active:bg-white/25",
};

// Sizes are tall enough for comfortable touch targets and line up with Input heights (md = h-12, lg = h-14).
const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-10 gap-1.5 rounded-lg px-4 text-sm",
  md: "h-12 gap-2 rounded-lg px-5 text-[15px]",
  lg: "h-14 gap-2.5 rounded-lg px-6 text-base",
};

/**
 * `className` passed to Button/ButtonLink should add layout (margins, width, alignment)
 * only — avoid overriding size or colour utilities, as there is no class-merge step.
 */
export function buttonClasses({ variant = "primary", size = "md", fullWidth = false }: StyleOptions = {}) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.985] disabled:cursor-not-allowed disabled:active:scale-100",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, StyleOptions {
  loading?: boolean;
  loadingText?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading = false, loadingText, leadingIcon, trailingIcon, className, children, disabled, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : leadingIcon}
      <span>{loading && loadingText ? loadingText : children}</span>
      {!loading && trailingIcon}
    </button>
  );
});

type ButtonLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  StyleOptions & { leadingIcon?: ReactNode; trailingIcon?: ReactNode };

export function ButtonLink({ variant, size, fullWidth, leadingIcon, trailingIcon, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonClasses({ variant, size, fullWidth }), className)} {...props}>
      {leadingIcon}
      <span>{children}</span>
      {trailingIcon}
    </Link>
  );
}
