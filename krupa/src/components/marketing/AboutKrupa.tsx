import { Container } from "@/components/ui/Container";
import { CountUp } from "@/components/ui/CountUp";
import { SectionHeading } from "./SectionHeading";

/**
 * Who is behind Krupa Laundry.
 *
 * Deliberately told as a story rather than a stat sheet. A customer deciding
 * whether to hand over a bag of clothes wants to know who they are dealing
 * with; the growth rates and margins that belong on a pitch deck would only
 * get in the way of that, so they are not here.
 */

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

export function AboutKrupa({ partnerCount, areaCount }: { partnerCount: number; areaCount: number }) {
  return (
    <section id="about" aria-labelledby="about-title" className="scroll-mt-20 bg-white py-20 lg:py-28">
      <Container>
        {/* Full width, like every other section heading on the page — inside the
            grid below it would wrap a third narrower than its neighbours. */}
        <SectionHeading
          id="about-title"
          eyebrow="About us"
          title="A laundry service built the slow way"
          description="Krupa Laundry is an independent venture, started in Mumbai in 2024 and run by the person who answers the phone."
        />

        <div className="mt-12 lg:grid lg:grid-cols-2 lg:gap-16">
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
          {areaCount > 0 && <Stat label="Neighbourhoods served" value={<CountUp value={areaCount} />} />}
          <Stat label="Collecting since" value="2024" />
        </dl>
      </Container>
    </section>
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
