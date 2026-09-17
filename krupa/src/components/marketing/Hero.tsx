import { ArrowRight, Check, MapPin, Star } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import type { NetworkStats } from "@/types";

interface HeroProps {
  stats: NetworkStats;
}

export function Hero({ stats }: HeroProps) {
  return (
    <section className="relative overflow-hidden pb-16 pt-8 sm:pt-12 lg:pb-24 lg:pt-16" aria-labelledby="hero-title">
      <div
        className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-[radial-gradient(closest-side,var(--color-brand-100),transparent)] opacity-70"
        aria-hidden="true"
      />
      <Container className="relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        <div className="animate-fade-up">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3.5 text-sm font-medium text-ink-600 shadow-card">
            <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">Mumbai</span>
            Now serving {stats.areasServed}+ neighbourhoods
          </p>

          <h1 id="hero-title" className="mt-6 text-balance text-[2.6rem] font-bold leading-[1.02] tracking-[-0.045em] text-ink-950 sm:text-6xl lg:text-[4.1rem]">
            Laundry picked up from your doorstep.{" "}
            <span className="font-display text-[1.08em] font-normal italic tracking-[-0.02em] text-brand-600">
              Clean clothes delivered back to you.
            </span>
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-ink-600">
            Krupa Laundry connects you with trusted local laundry partners near you. See prices upfront, pick a time
            that suits you, and track your order from pickup to delivery.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/book" size="lg" trailingIcon={<ArrowRight className="size-5" aria-hidden="true" />}>
              Book a Laundry Pickup
            </ButtonLink>
            <ButtonLink href="/services" size="lg" variant="outline">
              Explore Services
            </ButtonLink>
          </div>

          <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6">
            {stats.averageRating !== null && (
              <div>
                <dt className="text-sm text-ink-500">Partner rating</dt>
                <dd className="mt-1 flex items-center gap-1 text-xl font-bold tracking-tight text-ink-900">
                  <Star className="size-4 text-sun-400" fill="currentColor" strokeWidth={0} aria-hidden="true" />
                  {stats.averageRating}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm text-ink-500">Laundry partners</dt>
              <dd className="mt-1 text-xl font-bold tracking-tight text-ink-900">{stats.partnerCount}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-500">Turnaround</dt>
              <dd className="mt-1 text-xl font-bold tracking-tight text-ink-900">24–48h</dd>
            </div>
          </dl>
        </div>

        <HeroIllustration partnerCount={stats.partnerCount} />
      </Container>
    </section>
  );
}

/** Decorative product preview. Hidden from assistive tech — it illustrates, it doesn't inform. */
function HeroIllustration({ partnerCount }: { partnerCount: number }) {
  const steps = [
    { label: "Picked up", time: "10:12 AM", done: true },
    { label: "Processing", time: "In progress", current: true },
    { label: "Out for delivery", time: "Tomorrow" },
  ];

  return (
    <div className="relative mx-auto w-full max-w-[440px] pb-14 sm:py-14 lg:ml-auto" aria-hidden="true">
      <div className="relative">
        <div className="absolute inset-4 -rotate-3 rounded-[36px] bg-brand-600/90" />
        <div className="absolute inset-4 rotate-2 rounded-[36px] bg-brand-100" />

        <div className="relative rounded-[32px] border border-line bg-white p-6 shadow-raised animate-fade-up [animation-delay:120ms]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">Example order</p>
              <p className="mt-0.5 font-bold tracking-tight text-ink-900">How tracking looks</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-100">
              Processing
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-ink-50 p-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">Your local laundry partner</p>
              <p className="text-sm text-ink-500">Matched to your area</p>
            </div>
          </div>

          <ol className="mt-6 space-y-0">
            {steps.map((step, i) => (
              <li key={step.label} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span className={`absolute left-[11px] top-6 h-[calc(100%-18px)] w-0.5 ${step.done ? "bg-brand-500" : "bg-ink-200"}`} />
                )}
                <span
                  className={`relative flex size-6 shrink-0 items-center justify-center rounded-full ${
                    step.done ? "bg-brand-600 text-white" : step.current ? "bg-white ring-2 ring-brand-600 animate-pulse-ring" : "bg-white ring-2 ring-ink-200"
                  }`}
                >
                  {step.done ? <Check className="size-3.5" strokeWidth={3} /> : step.current ? <span className="size-2 rounded-full bg-brand-600" /> : null}
                </span>
                <div className="flex flex-1 items-baseline justify-between gap-2">
                  <span className={`font-semibold ${step.current || step.done ? "text-ink-900" : "text-ink-400"}`}>{step.label}</span>
                  <span className="text-sm text-ink-500">{step.time}</span>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex items-center justify-between border-t border-dashed border-line pt-4">
            <span className="text-sm text-ink-500">6 shirts · 3 trousers · 1 blazer</span>
            <span className="font-bold text-ink-900">₹591</span>
          </div>
        </div>
      </div>

      <div className="absolute left-2 top-0 hidden rounded-2xl border border-line bg-white px-4 py-3 shadow-raised animate-fade-up [animation-delay:300ms] sm:block lg:-left-6">
        <p className="text-xs font-medium text-ink-500">Matched in seconds</p>
        <p className="text-sm font-bold text-ink-900">{partnerCount} partners checked</p>
      </div>
      <div className="absolute bottom-0 right-2 rounded-2xl bg-ink-950 px-4 py-3 text-white shadow-raised animate-fade-up [animation-delay:420ms] lg:-right-4">
        <p className="text-xs font-medium text-ink-300">Price shown upfront</p>
        <p className="text-sm font-bold">No surprises at delivery</p>
      </div>
    </div>
  );
}
