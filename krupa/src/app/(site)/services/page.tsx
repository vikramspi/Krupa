import { BadgePercent, Check, Clock, Truck } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ServiceIcon, categoryIconKey } from "@/components/ui/ServiceIcon";
import { formatINR } from "@/lib/format";
import { DISCOUNT_CAP, DISCOUNT_THRESHOLD, FREE_PICKUP_THRESHOLD } from "@/lib/pricing";
import { serviceCatalog } from "@/services";

export const metadata: Metadata = {
  title: "Services & pricing",
  description: "Wash & fold, wash & iron, dry cleaning, premium garments, bedsheets, blankets and shoe cleaning — with transparent item prices.",
};

const unitLabel = { piece: "per piece", pair: "per pair", set: "per set" } as const;

export default async function ServicesPage() {
  const [offerings, categories, items] = await Promise.all([
    serviceCatalog.getServiceOfferings(),
    serviceCatalog.getCategories(),
    serviceCatalog.getServices(),
  ]);

  return (
    <>
      <section className="pb-12 pt-10 sm:pt-16" aria-labelledby="services-page-title">
        <Container>
          <p className="font-mono text-[13px] text-brand-700">Services & pricing</p>
          <h1 id="services-page-title" className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-ink-950 sm:text-6xl">
            Clear prices for{" "}
            <span className="font-semibold text-brand-700">every item</span> you send.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
            These are standard prices across our partner network. Each partner&apos;s exact price is shown before you
            confirm — usually within a few rupees of these.
          </p>

          <ul className="mt-8 grid gap-3 sm:grid-cols-3">
            <li className="flex items-center gap-3 rounded-lg border border-line bg-white p-4">
              <Truck className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="text-[15px] text-ink-700">
                <strong className="font-semibold text-ink-900">Free pickup</strong> on orders over {formatINR(FREE_PICKUP_THRESHOLD)}
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-lg border border-line bg-white p-4">
              <BadgePercent className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="text-[15px] text-ink-700">
                <strong className="font-semibold text-ink-900">10% off</strong> over {formatINR(DISCOUNT_THRESHOLD)} (up to {formatINR(DISCOUNT_CAP)})
              </span>
            </li>
            <li className="flex items-center gap-3 rounded-lg border border-line bg-white p-4">
              <Check className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="text-[15px] text-ink-700">
                <strong className="font-semibold text-ink-900">Pay after delivery</strong> — cash or UPI
              </span>
            </li>
          </ul>
        </Container>
      </section>

      <section aria-labelledby="offerings-title" className="bg-white py-16 lg:py-20">
        <Container>
          <h2 id="offerings-title" className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            What we clean
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {offerings.map((offering) => (
              <li key={offering.id} id={offering.id} className="scroll-mt-24 border border-line bg-white p-6 shadow-card target:border-brand-400 target:bg-brand-50/60">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-canvas text-brand-700 ring-1 ring-line">
                    <ServiceIcon icon={offering.icon} className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold tracking-tight text-ink-900">{offering.name}</h3>
                      <p className="font-mono text-[13px] text-ink-500">
                        from <span className="text-ink-900">{formatINR(offering.startingPrice)}</span> / {offering.priceUnit}
                      </p>
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{offering.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-600">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Clock className="size-4 text-ink-400" aria-hidden="true" />
                        {offering.turnaround}
                      </span>
                      {offering.includes.map((line) => (
                        <span key={line} className="inline-flex items-center gap-1.5">
                          <Check className="size-4 text-brand-600" aria-hidden="true" />
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section aria-labelledby="price-list-title" className="py-16 lg:py-20">
        <Container>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="price-list-title" className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
                Item price list
              </h2>
              <p className="mt-2 text-ink-500">Standard network prices. Specialty items may add a day to turnaround.</p>
            </div>
            <ButtonLink href="/book" className="self-start">
              Book a pickup
            </ButtonLink>
          </div>

          <div className="mt-8 grid gap-10 lg:grid-cols-3 lg:gap-x-12">
            {categories.map((category) => {
              const categoryItems = items.filter((item) => item.category === category.id);
              return (
                <section key={category.id} aria-labelledby={`cat-${category.id}`}>
                  <div className="flex items-center gap-3 border-b-2 border-ink-900 pb-3">
                    <ServiceIcon icon={categoryIconKey[category.id]} className="size-5 text-brand-700" />
                    <div>
                      <h3 id={`cat-${category.id}`} className="font-semibold text-ink-900">
                        {category.label}
                      </h3>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink-500">{category.description}</p>
                  {/* A counter price list: item, dotted leader, price. */}
                  <dl className="mt-4">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="ledger-row flex items-baseline py-2.5">
                        <dt className="text-[15px] text-ink-800">
                          {item.name}
                          {item.note && <span className="block text-xs text-ink-500">{item.note}</span>}
                        </dt>
                        <span className="leader" aria-hidden="true" />
                        <dd className="whitespace-nowrap text-right">
                          <span className="font-mono text-[15px] text-ink-900">{formatINR(item.price)}</span>
                          <span className="block text-xs text-ink-500">{unitLabel[item.unit]}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              );
            })}
          </div>
        </Container>
      </section>
    </>
  );
}
