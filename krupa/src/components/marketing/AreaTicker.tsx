import { Container } from "@/components/ui/Container";
import type { ServiceArea } from "@/types";

/**
 * Every neighbourhood we collect from, drifting past like a station board.
 *
 * The list is duplicated so the track can loop seamlessly; the copy is hidden
 * from assistive tech, which reads the real list once. With motion reduced the
 * track simply sits still and can be scrolled by hand.
 */
export function AreaTicker({ areas }: { areas: ServiceArea[] }) {
  if (areas.length === 0) return null;
  const names = areas.map((area) => area.name);

  return (
    <section aria-labelledby="ticker-title" className="border-b border-line py-5">
      <h2 id="ticker-title" className="sr-only">
        Neighbourhoods we collect from
      </h2>
      <Container className="flex items-center gap-6">
        <span className="hidden shrink-0 font-mono text-[13px] text-ink-500 sm:block">We collect in</span>
        <div className="ticker-mask relative min-w-0 flex-1 overflow-x-auto">
          {/* No gap between the two runs: the loop shifts by exactly one run,
              so the copy has to start where the original left off. */}
          <div className="ticker-track flex w-max items-center">
            <TickerRun names={names} />
            <TickerRun names={names} duplicate />
          </div>
        </div>
      </Container>
    </section>
  );
}

function TickerRun({ names, duplicate = false }: { names: string[]; duplicate?: boolean }) {
  return (
    <ul className="flex items-center" aria-hidden={duplicate || undefined}>
      {names.map((name) => (
        <li key={name} className="flex shrink-0 items-center gap-6 whitespace-nowrap pr-6 text-[15px] text-ink-700">
          {name}
          <span className="size-1 rounded-full bg-line" aria-hidden="true" />
        </li>
      ))}
    </ul>
  );
}
