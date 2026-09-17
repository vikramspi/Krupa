"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Visually hide the title (it is still announced). */
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Accessible modal built on the native <dialog> element (focus trapping, Esc to
 * close, inert background). Bottom sheet on mobile, right-hand drawer from md up.
 */
export function Sheet({ open, onClose, title, hideTitle, description, children, footer, className }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Anything that closes the dialog natively (a browser back gesture, form
  // method="dialog"…) must not leave `open` stale, or the next open would be a no-op.
  const latest = useRef({ open, onClose });
  useEffect(() => {
    latest.current = { open, onClose };
  });
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onNativeClose = () => {
      if (latest.current.open) latest.current.onClose();
    };
    dialog.addEventListener("close", onNativeClose);
    return () => dialog.removeEventListener("close", onNativeClose);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        // `open:flex` (not `flex`) so author CSS never overrides the closed dialog's display:none.
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[28px] bg-white p-0 text-ink-900 shadow-raised open:flex open:animate-fade-up",
        "md:ml-auto md:mr-0 md:mt-0 md:h-dvh md:max-h-none md:w-[520px] md:rounded-none md:rounded-l-[28px]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 pb-4 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className={cn("text-lg font-bold tracking-tight", hideTitle && "sr-only")}>
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="mt-0.5 text-sm text-ink-500">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-1 flex size-10 shrink-0 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          aria-label="Close"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {footer && <div className="border-t border-line bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">{footer}</div>}
    </dialog>
  );
}
