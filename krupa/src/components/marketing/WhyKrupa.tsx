import { CalendarClock, ReceiptIndianRupee, Route, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { CountUp } from "@/components/ui/CountUp";
import { FREE_PICKUP_THRESHOLD } from "@/lib/pricing";
import { SectionHeading } from "./SectionHeading";

const reasons = [
  {
    icon: Truck,
    title: "Doorstep pickup & delivery",
    description: `We collect from your home or office and bring everything back. Pickup is free on orders over ₹${FREE_PICKUP_THRESHOLD}.`,
  },
  {
    icon: ShieldCheck,
    title: "Trusted local partners",
    description: "We check every partner for quality, hygiene and reliability before they can take your order.",
  },
  {
    icon: ReceiptIndianRupee,
    title: "Transparent pricing",
    description: "Item-by-item prices before you book. What you see at checkout is what you pay.",
  },
  {
    icon: CalendarClock,
    title: "Convenient scheduling",
    description: "Morning, afternoon and evening slots, seven days a week — including same-day pickup with many partners.",
  },
  {
    icon: Route,
    title: "Easy tracking",
    description: "Follow your order from pickup to processing to delivery, with a clear timeline at every step.",
  },
];

export function WhyKrupa({ partnerCount }: { partnerCount: number }) {
  return (
    <section aria-labelledby="why-title" className="on-dark bg-ink-950 py-20 text-white lg:py-28">
      <Container>
        <SectionHeading
          id="why-title"
          tone="dark"
          eyebrow="Why Krupa Laundry"
          title={
            <>
              The reliable way to get laundry done in <span className="text-brand-300">Mumbai</span>
            </>
          }
          description="We do the work of finding a good laundry near you — then stay with your order until it's back in your hands."
        />

        {/* Ruled like the back of a counter ledger: hairlines, no cards. */}
        <ul className="mt-14 border-t border-white/15 sm:grid sm:grid-cols-2 sm:gap-x-12 lg:grid-cols-3 lg:gap-x-14">
          {reasons.map((reason) => (
            <li key={reason.title} className="border-b border-white/15 py-7">
              <reason.icon className="size-5 text-brand-300" aria-hidden="true" strokeWidth={1.5} />
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{reason.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-300">{reason.description}</p>
            </li>
          ))}
          <li className="border-b border-white/15 py-7">
            {/* A real figure or none at all — never a fabricated zero. */}
            {partnerCount > 0 && (
              <p className="font-mono text-5xl leading-none text-brand-300">
                <CountUp value={partnerCount} />
              </p>
            )}
            <p className={cn("text-[15px] leading-relaxed text-ink-300", partnerCount > 0 && "mt-4")}>
              {partnerCount > 0 ? "hand-picked" : "Hand-picked"} laundry partners across the city, matched to you by
              distance, rating, turnaround and pickup availability.
            </p>
          </li>
        </ul>
      </Container>
    </section>
  );
}
