import type { Metadata } from "next";
import { TrackLookupPanel } from "@/components/tracking/TrackLookupPanel";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Track your order",
  description: "Track your Krupa Laundry order with your order ID and mobile number.",
};

export default function TrackPage() {
  return (
    <section className="pb-20 pt-10 sm:pt-16" aria-labelledby="track-title">
      <Container>
        <p className="font-mono text-[13px] text-brand-700">Order tracking</p>
        <h1 id="track-title" className="mt-3 max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-ink-950 sm:text-5xl">
          Where&apos;s my <span className="font-semibold text-brand-700">laundry</span>?
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-500">
          See exactly where your order is — from pickup, to cleaning, to your doorstep.
        </p>
        <div className="mt-10">
          <TrackLookupPanel />
        </div>
      </Container>
    </section>
  );
}
