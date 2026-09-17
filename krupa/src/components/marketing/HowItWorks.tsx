import { CalendarClock, MapPinned, Sparkles, Truck } from "lucide-react";
import { Container } from "@/components/ui/Container";
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
        <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title} className="group relative rounded-3xl border border-line bg-white p-6 shadow-card">
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition-colors duration-300 group-hover:bg-brand-600 group-hover:text-white">
                  <step.icon className="size-6" aria-hidden="true" strokeWidth={1.75} />
                </span>
                <span className="font-display text-4xl italic text-ink-200" aria-hidden="true">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-bold tracking-tight text-ink-900">
                <span className="sr-only">Step {index + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{step.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
