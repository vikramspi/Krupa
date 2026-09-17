import { ArrowRight, Clock } from "lucide-react";
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
          <ButtonLink href="/services" variant="outline" trailingIcon={<ArrowRight className="size-4" aria-hidden="true" />} className="self-start md:self-auto">
            View all prices
          </ButtonLink>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offerings.map((offering) => (
            <li key={offering.id}>
              <Link
                href={`/services#${offering.id}`}
                className="group flex h-full flex-col rounded-3xl border border-line bg-canvas p-5 transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-ink-200 hover:bg-white hover:shadow-raised"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-card ring-1 ring-line transition-colors group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                  <ServiceIcon icon={offering.icon} className="size-6" />
                </span>
                <h3 className="mt-5 font-bold tracking-tight text-ink-900">{offering.name}</h3>
                <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-ink-500">{offering.shortDescription}</p>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
                  <span className="text-ink-500">
                    from <span className="font-bold text-ink-900">{formatINR(offering.startingPrice)}</span>
                    <span className="text-ink-400"> / {offering.priceUnit}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-ink-500">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {offering.turnaround}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
