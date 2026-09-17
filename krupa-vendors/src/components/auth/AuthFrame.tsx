import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/ui/Logo";

/** Signed-out pages: logo, one card, and the operator contact. */
export function AuthFrame({ children }: { children: ReactNode }) {
  const phone = process.env.NEXT_PUBLIC_SUPPORT_PHONE;
  return (
    <main id="main" className="min-h-dvh py-10 sm:py-16">
      <Container size="tight">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Logo href="/login" />
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700">Partner</span>
        </div>
        {children}
        {phone && (
          <p className="mt-6 text-center text-sm text-ink-500">
            Trouble logging in? Call Krupa Laundry on{" "}
            <a href={`tel:+91${phone}`} className="font-semibold text-ink-800 underline underline-offset-4">
              +91 {phone.slice(0, 5)} {phone.slice(5)}
            </a>
          </p>
        )}
      </Container>
    </main>
  );
}
