import { Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center px-4">
      <Logo className="mb-10" />
      <EmptyState
        icon={<Compass />}
        tone="brand"
        title="We couldn't find that page"
        description="The link may be broken or the page may have moved. Let's get you back on track."
        actions={
          <>
            <ButtonLink href="/">Back to Home</ButtonLink>
            <ButtonLink href="/track" variant="outline">
              Track an order
            </ButtonLink>
          </>
        }
      />
    </main>
  );
}
