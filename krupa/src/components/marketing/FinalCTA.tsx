import { ArrowRight, Check } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FREE_PICKUP_THRESHOLD } from "@/lib/pricing";

const assurances = [`Free pickup over ₹${FREE_PICKUP_THRESHOLD}`, "Pay after delivery", "Track every step"];

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-title" className="pb-20 lg:pb-28">
      <Container>
        <div className="relative overflow-hidden rounded-[36px] bg-brand-700 px-6 py-14 text-center text-white sm:px-12 lg:py-20">
          <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full text-brand-600" viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 80c150-50 300-50 450 0s300 50 450 0 225-40 300-20v100H0z" fill="currentColor" />
          </svg>
          <div className="relative">
            <h2 id="final-cta-title" className="mx-auto max-w-2xl text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Schedule Your Pickup
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-brand-100">
              Spend your weekend on anything but laundry. Book in two minutes — we&apos;ll take it from here.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/book" size="lg" variant="dark" trailingIcon={<ArrowRight className="size-5" aria-hidden="true" />}>
                Book a Laundry Pickup
              </ButtonLink>
              <ButtonLink href="/track" size="lg" variant="inverse">
                Track an order
              </ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-brand-50">
              {assurances.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-4 text-brand-200" aria-hidden="true" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
