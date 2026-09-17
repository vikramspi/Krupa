"use client";

import { useEffect } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";
import { reportError } from "@/lib/reportError";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <Container size="narrow" className="py-20">
      <ErrorState
        title="Something went wrong on this page"
        message="We've logged the problem. You can retry, or head back and start again — your booking progress is saved."
        onRetry={reset}
        actions={
          <ButtonLink href="/" variant="outline">
            Back to home
          </ButtonLink>
        }
      />
    </Container>
  );
}
