import { CalendarClock, ReceiptIndianRupee, Route, ShieldCheck, Truck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import { FREE_PICKUP_THRESHOLD } from "@/lib/pricing";
import { SectionHeading } from "./SectionHeading";

// Order and `wide` flags are arranged so the 3-column bento grid fills without gaps.
const reasons = [
  {
    icon: Truck,
    title: "Doorstep pickup & delivery",
    description: `We collect from your home or office and bring everything back. Pickup is free on orders over ₹${FREE_PICKUP_THRESHOLD}.`,
    wide: true,
  },
  {
    icon: ShieldCheck,
    title: "Trusted local partners",
    description: "We check every partner for quality, hygiene and reliability before they can take your order.",
    wide: false,
  },
  {
    icon: ReceiptIndianRupee,
    title: "Transparent pricing",
    description: "Item-by-item prices before you book. What you see at checkout is what you pay.",
    wide: false,
  },
  {
    icon: CalendarClock,
    title: "Convenient scheduling",
    description: "Morning, afternoon and evening slots, seven days a week — including same-day pickup with many partners.",
    wide: true,
  },
  {
    icon: Route,
    title: "Easy tracking",
    description: "Follow your order from pickup to processing to delivery, with a clear timeline at every step.",
    wide: false,
  },
];

export function WhyKrupa({ partnerCount }: { partnerCount: number }) {
  return (
    <section aria-labelledby="why-title" className="bg-ink-950 py-20 text-white lg:py-28">
      <Container>
        <SectionHeading
          id="why-title"
          tone="dark"
          eyebrow="Why Krupa Laundry"
          title={
            <>
              The reliable way to get laundry done in{" "}
              <span className="font-display font-normal italic text-brand-300">Mumbai</span>
            </>
          }
          description="We do the work of finding a good laundry near you — then stay with your order until it's back in your hands."
        />

        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {reasons.map((reason) => (
            <li
              key={reason.title}
              className={cn(
                "rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition-colors duration-300 hover:bg-white/[0.07] sm:p-7",
                reason.wide && "md:col-span-2",
              )}
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300 ring-1 ring-inset ring-brand-400/20">
                <reason.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight">{reason.title}</h3>
              <p className="mt-2 max-w-md text-[15px] leading-relaxed text-ink-300">{reason.description}</p>
            </li>
          ))}
          <li className="flex flex-col justify-between gap-6 rounded-3xl bg-brand-600 p-6 sm:flex-row sm:items-end sm:p-7 md:col-span-2">
            <p className="font-display text-6xl italic leading-none">{partnerCount}</p>
            <p className="max-w-sm text-[15px] leading-relaxed text-brand-50">
              hand-picked laundry partners across the city, matched to you by distance, rating, turnaround and pickup
              availability.
            </p>
          </li>
        </ul>
      </Container>
    </section>
  );
}
