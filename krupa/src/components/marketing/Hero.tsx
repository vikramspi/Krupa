import { Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { NetworkStats } from "@/types";
import { BillPad, type BillItem } from "./BillPad";

interface HeroProps {
  stats: NetworkStats;
  /** Real prices from the catalogue, keyed by item id, for the example bills. */
  billCatalog: Record<string, BillItem>;
}

export function Hero({ stats, billCatalog }: HeroProps) {
  return (
    <section className="border-b border-line pb-14 pt-10 sm:pt-14 lg:pb-20" aria-labelledby="hero-title">
      <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <p className="font-mono text-[13px] text-brand-700">Mumbai, {stats.areasServed}+ neighbourhoods</p>

          <h1 id="hero-title" className="mt-5 text-balance text-[2.7rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink-950 sm:text-6xl lg:text-[4rem]">
            We collect your laundry, and bring it back clean.
          </h1>

          <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-ink-600">
            Krupa Laundry hands your clothes to a local laundry whose prices and turnaround you can see before you
            book. Picked up from your door, delivered back to it.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/book" size="lg">
              Book a pickup
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="outline">
              See prices
            </ButtonLink>
          </div>

          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
            {stats.averageRating !== null && (
              <div>
                <dt className="text-sm text-ink-500">Partner rating</dt>
                <dd className="mt-1 flex items-center gap-1 font-mono text-xl text-ink-900">
                  <Star className="size-4 text-sun-400" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                  {stats.averageRating}
                </dd>
              </div>
            )}
            {/* Omitted rather than shown as 0 when the count is unavailable. */}
            {stats.partnerCount > 0 && (
              <div>
                <dt className="text-sm text-ink-500">Laundry partners</dt>
                <dd className="mt-1 font-mono text-xl text-ink-900">{stats.partnerCount}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-ink-500">Turnaround</dt>
              <dd className="mt-1 font-mono text-xl text-ink-900">24–48h</dd>
            </div>
          </dl>
        </div>

        <BillPad catalog={billCatalog} />
      </Container>
    </section>
  );
}
