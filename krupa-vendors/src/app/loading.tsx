import { Container } from "@/components/ui/Container";
import { WashLoader, WashLoaderMessages } from "@/components/ui/WashLoader";

/** Shown while a page is being prepared (Next.js route loading state). */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[70dvh] items-center justify-center py-20">
      <Container size="tight" className="text-center">
        <WashLoader size={132} className="mx-auto" />
        <p className="mt-6 text-lg font-bold tracking-tight text-ink-900">Getting things ready</p>
        <p className="mt-1 text-[15px] text-ink-500">
          <WashLoaderMessages />
        </p>
      </Container>
    </div>
  );
}
