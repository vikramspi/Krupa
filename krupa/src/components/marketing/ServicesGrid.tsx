import { Clock } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ServiceIcon } from "@/components/ui/ServiceIcon";
import { formatINR } from "@/lib/format";
import type { ServiceOffering } from "@/types";
import { SectionHeading } from "./SectionHeading";

export function ServicesGrid({ offerings }: { offerings: ServiceOffering[] }) {
  return (
    <section aria-labelledby="services-title" className="bg-white py-20 lg:py-28">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="services-title"
            eyebrow="Services"
            title="Everything your wardrobe needs"
            description="From everyday wash & fold to silk sarees and sneakers, handled by partners who specialise in it."
          />
          <ButtonLink href="/services" variant="outline" className="self-start md:self-auto">
            View all prices
          </ButtonLink>
        </div>

        <ul className="mt-10 border-t border-line md:grid md:grid-cols-2 md:gap-x-12">
          {offerings.map((offering) => (
            <li key={offering.id} className="border-b border-line">
              <Link href={`/services#${offering.id}`} className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-brand-50/60">
                <ServiceIcon icon={offering.icon} className="size-5 shrink-0 translate-y-1 text-brand-700" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold tracking-tight text-ink-900 group-hover:text-brand-800">{offering.name}</span>
                  <span className="mt-0.5 block text-[15px] leading-snug text-ink-500">{offering.shortDescription}</span>
                  <span className="mt-1 flex items-center gap-1 text-sm text-ink-400">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {offering.turnaround}
                  </span>
                </span>
                <span className="shrink-0 whitespace-nowrap text-right">
                  <span className="font-mono text-[15px] text-ink-900">{formatINR(offering.startingPrice)}</span>
                  <span className="block text-xs text-ink-400">per {offering.priceUnit}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
