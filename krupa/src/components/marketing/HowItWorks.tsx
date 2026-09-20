import { CalendarClock, MapPinned, Sparkles, Truck } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { InView } from "@/components/ui/InView";
import { SectionHeading } from "./SectionHeading";

const steps = [
  {
    icon: CalendarClock,
    title: "Book a pickup",
    description: "Tell us where you are, what needs cleaning and when to collect it. It takes under two minutes.",
  },
  {
    icon: MapPinned,
    title: "Get matched nearby",
    description: "We compare nearby laundry partners on distance, rating and turnaround, and show you prices upfront.",
  },
  {
    icon: Sparkles,
    title: "Cleaned with care",
    description: "Your partner washes, dry cleans or presses every item according to its fabric and care label.",
  },
  {
    icon: Truck,
    title: "Delivered back fresh",
    description: "Follow each step on your tracking page and get your clothes back at your door in as little as 24 hours.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className="scroll-mt-20 py-20 lg:py-28">
      <Container>
        <SectionHeading
          id="how-it-works-title"
          eyebrow="How it works"
          title="Fresh laundry in four simple steps"
          description="No calling around, no haggling, no guesswork. We handle the matching so you don't have to."
        />
        {/* Four stages strung along one line, like garments on a rail. */}
        <InView as="ol" className="rail mt-12 border-t border-line lg:grid lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="border-b border-line py-6 lg:border-b-0 lg:border-r lg:px-6 lg:py-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
              style={{ transitionDelay: `${index * 110}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-brand-700" aria-hidden="true">
                  {index + 1}
                </span>
                <step.icon className="size-5 text-ink-400" aria-hidden="true" strokeWidth={1.5} />
                <h3 className="text-lg font-semibold tracking-tight text-ink-900">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
              </div>
              <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink-600 lg:mt-4">{step.description}</p>
            </li>
          ))}
        </InView>
      </Container>
    </section>
  );
}
