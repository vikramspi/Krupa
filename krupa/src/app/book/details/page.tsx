"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { BookingStepLayout } from "@/components/booking/BookingStepLayout";
import { CustomerDetailsForm } from "@/components/booking/CustomerDetailsForm";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { StepHeader } from "@/components/ui/StepHeader";
import { useBookingGuard } from "@/hooks/useBookingGuard";
import { useBookingSummary } from "@/hooks/useBookingSummary";
import { useCustomer } from "@/hooks/useCustomer";
import { useBookingStore, type CustomerDetailsDraft } from "@/state/bookingStore";

const FORM_ID = "customer-details-form";

export default function DetailsStepPage() {
  const ready = useBookingGuard("details");
  const customer = useCustomer();
  if (!ready || !customer.sessionReady) return <LoadingState title="Loading your details…" />;

  // A verified mobile number is required before an order can be placed — an
  // email+password session still has to pass this gate.
  if (!customer.data?.phone) {
    return (
      <Container size="narrow">
        <EmptyState
          className="border border-line bg-white py-14 shadow-card"
          tone="brand"
          icon={<ShieldCheck />}
          title={customer.isSignedIn ? "Verify your mobile number to continue" : "Verify your mobile number to continue"}
          description="We send a one-time code to confirm it's you. Your laundry partner needs a reachable number for the pickup — your basket is saved."
          actions={
            <>
              <ButtonLink href="/login?next=/book/details">Verify my number</ButtonLink>
              <ButtonLink href="/book/schedule" variant="outline">
                Back to pickup time
              </ButtonLink>
            </>
          }
        />
      </Container>
    );
  }

  return <DetailsStep customer={customer.data} />;
}

function DetailsStep({ customer }: { customer: NonNullable<ReturnType<typeof useCustomer>["data"]> }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const summary = useBookingSummary();
  const location = summary.location!;
  const draft = useBookingStore((s) => s.details);
  const setDetails = useBookingStore((s) => s.setDetails);

  const savedAddress = customer.addresses.find((a) => a.id === location.savedAddressId);
  const initialValues: CustomerDetailsDraft = {
    name: draft?.name || customer.name || "",
    // Always the verified number — the server rejects anything else.
    phone: customer.phone ?? "",
    email: draft?.email ?? "",
    line1: draft?.line1 ?? savedAddress?.line1 ?? "",
    line2: draft?.line2 ?? savedAddress?.line2 ?? (location.source === "current" ? (location.addressLine?.split(",")[0] ?? "") : ""),
    landmark: draft?.landmark ?? savedAddress?.landmark ?? "",
    instructions: draft?.instructions ?? "",
    saveAddress: draft?.saveAddress ?? false,
  };

  return (
    <BookingStepLayout
      summary={summary}
      continueLabel="Review order"
      onContinue={() => formRef.current?.requestSubmit()}
      showPickupInSummary
    >
      <StepHeader
        eyebrow="Step 4 of 5"
        title="Where and who should we pick up from?"
        description="Your details are shared only with your laundry partner for this pickup."
      />
      <Card className="mt-8" padding="lg">
        <CustomerDetailsForm
          ref={formRef}
          id={FORM_ID}
          initialValues={initialValues}
          location={location}
          canSaveAddress={!savedAddress}
          lockPhone
          onSubmit={(values) => {
            setDetails(values);
            router.push("/book/review");
          }}
        />
      </Card>
    </BookingStepLayout>
  );
}
