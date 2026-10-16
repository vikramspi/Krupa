import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { CountUp } from "@/components/ui/CountUp";
import { serviceAreas } from "@/data/areas";
import { isDatabaseConfigured } from "@/server/env";
import { getNetworkStats } from "@/server/repositories/vendors";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Krupa Laundry is an independent laundry service started in Mumbai in 2024, matching every order to a named local laundry — several of them the founder's own family.",
};

// The partner count comes from the database: refresh the prerendered page every 5 minutes.
export const revalidate = 300;

const milestones = [
  {
    year: "May 2024",
    title: "A WhatsApp number and a few local laundries",
    body: "Krupa started as a message thread. Orders came in by WhatsApp and went out to laundries nearby, matched by hand until the matching could be automated.",
  },
  {
    year: "2024–25",
    title: "A proper network",
    body: "Partners were visited, checked and onboarded one at a time — for wash quality, hygiene and whether they would actually turn an order around when they said they would.",
  },
  {
    year: "Today",
    title: "Booking in two minutes",
    body: "Item-by-item prices before you book, a partner matched to your neighbourhood, and a timeline you can follow from pickup to delivery.",
  },
];

/**
 * Customers served since 2024. Unlike the partner and neighbourhood counts
 * beside it, this is a figure we state rather than one the database can
 * answer: orders placed over WhatsApp before this site existed are not in it,
 * so a live count would read lower than the truth. Update it by hand.
 */
const CUSTOMERS_SERVED = "5,000+";

export default async function AboutPage() {
  const areasServed = serviceAreas.filter((area) => area.coverage === "supported").length;
  // The page must render even if the database is unreachable.
  const partnerCount = isDatabaseConfigured()
    ? await getNetworkStats()
        .then((stats) => stats.partnerCount)
        .catch(() => 0)
    : 0;

  return (
    <>
      <section className="pb-12 pt-10 sm:pt-16" aria-labelledby="about-title">
        <Container>
          <p className="font-mono text-[13px] text-brand-700">About us</p>
          <h1
            id="about-title"
            className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-ink-950 sm:text-6xl"
          >
            A laundry service built the <span className="font-semibold text-brand-700">slow way</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
            Krupa Laundry is an independent venture, started in Mumbai in 2024 and run by the person who answers the
            phone.
          </p>
        </Container>
      </section>

      <section aria-labelledby="story-title" className="pb-16">
        <Container>
          <h2 id="story-title" className="sr-only">
            Why Krupa Laundry exists
          </h2>
          <div className="lg:grid lg:grid-cols-2 lg:gap-16">
            <div className="max-w-xl space-y-4 text-[17px] leading-relaxed text-ink-600">
              <p>
                Mumbai has no shortage of good laundries. What it has is a gap between them and the people who need
                them — no way to know who is nearby, who is any good, what it will cost, or when you will get your
                clothes back.
              </p>
              <p>
                Krupa Laundry exists to close that gap, without putting a faceless app between you and the people
                doing the work. Every order goes to a named local laundry you can see before you book, at prices set
                item by item.
              </p>
              <p>
                It was founded by <strong className="font-semibold text-ink-900">Vikram Kanaujiya</strong>, a dual
                degree student in Industrial Engineering &amp; Management at IIT Kharagpur, who built and still runs
                the service — the matching, the partner network, and this website.
              </p>
              <p>
                Several of the laundries collecting for Krupa are his own family. That is not a detail we keep quiet
                about: it is why every partner is named on this site instead of hidden behind a brand, and why a bad
                wash here is someone&apos;s reputation rather than a support ticket.
              </p>
            </div>

            {/* The story, ruled like the counter ledger the rest of the site uses. */}
            <ol className="mt-12 border-t border-line lg:mt-0">
              {milestones.map((milestone) => (
                <li key={milestone.year} className="border-b border-line py-7">
                  <p className="font-mono text-[13px] text-brand-700">{milestone.year}</p>
                  <h3 className="mt-3 text-lg font-semibold tracking-tight text-ink-900">{milestone.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{milestone.body}</p>
                </li>
              ))}
            </ol>
          </div>

          <dl className="mt-12 grid gap-x-12 gap-y-6 border-t border-line pt-6 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Customers served" value={CUSTOMERS_SERVED} />
            {partnerCount > 0 && <Stat label="Laundry partners" value={<CountUp value={partnerCount} />} />}
            {areasServed > 0 && <Stat label="Neighbourhoods served" value={<CountUp value={areasServed} />} />}
            <Stat label="Collecting since" value="2024" />
          </dl>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            <ButtonLink href="/book" size="lg">
              Book a pickup
            </ButtonLink>
            <ButtonLink href="/#coverage" size="lg" variant="outline">
              See where we collect
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[13px] text-ink-500">{label}</dt>
      <dd className="mt-1 font-mono text-3xl text-ink-900">{value}</dd>
    </div>
  );
}
