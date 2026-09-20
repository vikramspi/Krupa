"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/ui/Container";
import { RatingStars } from "@/components/ui/RatingStars";
import type { PlatformReview } from "@/types";
import { SectionHeading } from "./SectionHeading";

export function ReviewsCarousel({ reviews }: { reviews: PlatformReview[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const updateEdges = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setEdges({
      atStart: track.scrollLeft <= 4,
      atEnd: track.scrollLeft + track.clientWidth >= track.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    return () => observer.disconnect();
  }, [updateEdges]);

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.querySelector("li");
    if (!track || !card) return;
    track.scrollBy({ left: direction * (card.clientWidth + 16), behavior: "smooth" });
  };

  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / Math.max(1, reviews.length);

  return (
    <section aria-labelledby="reviews-title" className="overflow-hidden bg-white py-20 lg:py-28">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionHeading
            id="reviews-title"
            eyebrow="Customer reviews"
            title="Loved by busy Mumbaikars"
            description={`Rated ${average.toFixed(1)} out of 5 by customers across the city.`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              disabled={edges.atStart}
              aria-controls="reviews-track"
              aria-label="Previous reviews"
              className="flex size-11 items-center justify-center rounded-lg border border-line bg-white text-ink-800 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              disabled={edges.atEnd}
              aria-controls="reviews-track"
              aria-label="Next reviews"
              className="flex size-11 items-center justify-center rounded-lg border border-line bg-white text-ink-800 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </Container>

      <Container className="mt-12">
        <ul
          id="reviews-track"
          ref={trackRef}
          onScroll={updateEdges}
          aria-roledescription="carousel"
          aria-label="Customer reviews"
          tabIndex={0}
          className="no-scrollbar relative -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:-mx-8 lg:scroll-px-8 lg:px-8"
        >
          {reviews.map((review, index) => (
            <li
              key={review.id}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${reviews.length}`}
              className="flex w-[85%] shrink-0 snap-start flex-col border border-line bg-white p-6 shadow-card sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)]"
            >
              <RatingStars rating={review.rating} size="md" />
              <blockquote className="mt-4 flex-1 text-[16px] leading-relaxed text-ink-800">{review.text}</blockquote>
              <div className="mt-6 border-t border-line pt-4">
                <div className="flex items-baseline">
                  <p className="font-semibold text-ink-900">{review.author}</p>
                  <span className="leader" aria-hidden="true" />
                  <p className="shrink-0 font-mono text-[13px] text-ink-500">{review.area}</p>
                </div>
                <p className="mt-1 font-mono text-[13px] text-ink-400">{review.service}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
