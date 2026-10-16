import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { FREE_PICKUP_THRESHOLD } from "@/lib/pricing";

const assurances = [`Free pickup over ₹${FREE_PICKUP_THRESHOLD}`, "Pay after delivery", "Track every step"];

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-title" className="pb-20 lg:pb-28">
      <Container>
        {/* A slip torn off the counter pad. */}
        <div className="on-dark tear-y relative bg-brand-700 px-6 py-14 text-white sm:px-10 lg:px-14 lg:py-16">
          <div className="lg:flex lg:items-end lg:justify-between lg:gap-14">
            <div>
              <p className="font-mono text-[13px] text-brand-200">Seven days a week, across Mumbai</p>
              <h2
                id="final-cta-title"
                className="mt-4 max-w-xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl"
              >
                Leave the bag by the door.
              </h2>
              <p className="mt-4 max-w-md text-lg leading-relaxed text-brand-100">
                Book in two minutes. We collect it, a local laundry cleans it, and it comes back folded.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0 lg:flex-col">
              <ButtonLink href="/book" size="lg" variant="outline">
                Book a pickup
              </ButtonLink>
              <ButtonLink href="/track" size="lg" variant="inverse">
                Track an order
              </ButtonLink>
            </div>
          </div>

          <ul className="mt-10 grid gap-y-2 border-t border-white/20 pt-5 font-mono text-[13px] text-brand-100 sm:grid-cols-3">
            {assurances.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
