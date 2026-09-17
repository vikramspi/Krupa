import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <main id="main">
      <Container size="tight" className="py-24 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-ink-500">This page doesn&apos;t exist in the partner portal.</p>
        <ButtonLink href="/orders" className="mt-6">
          Go to my orders
        </ButtonLink>
      </Container>
    </main>
  );
}
