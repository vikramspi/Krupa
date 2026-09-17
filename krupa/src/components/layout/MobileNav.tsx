"use client";

import { ChevronRight, PackageSearch } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatPhone } from "@/lib/format";
import { siteConfig } from "@/lib/config";

export interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  id: string;
  open: boolean;
  links: NavLink[];
  isActive: (href: string) => boolean;
  onClose: (restoreFocus: boolean) => void;
}

export function MobileNav({ id, open, links, isActive, onClose }: MobileNavProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div id={id} hidden={!open} className="lg:hidden">
      <div className="fixed inset-x-0 bottom-0 top-16 z-40 overflow-y-auto border-t border-line bg-canvas animate-fade-in">
        <nav aria-label="Mobile" className="px-4 pb-8 pt-4 sm:px-6">
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => onClose(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 items-center justify-between px-5 text-[17px] font-semibold text-ink-800 active:bg-ink-50",
                    isActive(link.href) && "text-brand-700",
                  )}
                >
                  {link.label}
                  <ChevronRight className="size-5 text-ink-300" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid gap-3">
            <ButtonLink href="/book" size="lg" fullWidth onClick={() => onClose(false)}>
              Book a Laundry Pickup
            </ButtonLink>
            <ButtonLink
              href="/track"
              size="lg"
              variant="outline"
              fullWidth
              onClick={() => onClose(false)}
              leadingIcon={<PackageSearch className="size-5" aria-hidden="true" />}
            >
              Track an order
            </ButtonLink>
          </div>
          <p className="mt-8 text-center text-sm text-ink-500">
            Need help? Call{" "}
            <a href={`tel:+91${siteConfig.supportPhone}`} className="font-semibold text-ink-800 underline underline-offset-4">
              {formatPhone(siteConfig.supportPhone)}
            </a>
          </p>
        </nav>
      </div>
    </div>
  );
}
