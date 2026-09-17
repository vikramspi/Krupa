"use client";

import { rememberGuestAccess } from "@/lib/guestTrackingAccess";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { isValidIndianMobile, isValidOrderId, normalizeOrderId } from "@/lib/validation";
import { orderService } from "@/services";
import type { Order } from "@/types";

interface TrackOrderLookupFormProps {
  defaultOrderId?: string;
  defaultPhone?: string;
  /** Show the order ID as fixed text (used when verifying access to a specific order). */
  lockOrderId?: boolean;
  submitLabel?: string;
  /** Defaults to opening the tracking page for the order that was found. */
  onSuccess?: (order: Order) => void;
}

export function TrackOrderLookupForm({
  defaultOrderId = "",
  defaultPhone = "",
  lockOrderId = false,
  submitLabel = "Track order",
  onSuccess,
}: TrackOrderLookupFormProps) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(defaultOrderId);
  const [phone, setPhone] = useState(defaultPhone);
  const [errors, setErrors] = useState<{ orderId?: string; phone?: string }>({});
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const orderIdRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (!isValidOrderId(orderId)) nextErrors.orderId = "Enter your order ID, e.g. KR-10284.";
    if (!isValidIndianMobile(phone)) nextErrors.phone = "Enter the 10-digit mobile number used for the order.";
    setErrors(nextErrors);
    setLookupError(null);
    if (nextErrors.orderId) return orderIdRef.current?.focus();
    if (nextErrors.phone) return phoneRef.current?.focus();

    setPending(true);
    try {
      const order = await orderService.lookupOrder(orderId, phone);
      rememberGuestAccess(order.id, phone);
      if (onSuccess) onSuccess(order);
      else router.push(`/track/${order.id}`);
    } catch (error) {
      setLookupError(getErrorMessage(error));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      {lockOrderId ? (
        <p className="rounded-2xl bg-canvas px-4 py-3 text-[15px] text-ink-600">
          Order ID <span className="ml-1 font-mono font-bold text-ink-900">{normalizeOrderId(orderId)}</span>
        </p>
      ) : (
        <Input
          ref={orderIdRef}
          label="Order ID"
          name="orderId"
          placeholder="KR-10284"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          value={orderId}
          onChange={(event) => setOrderId(event.target.value.toUpperCase())}
          error={errors.orderId}
          hint="You'll find it on your booking confirmation"
        />
      )}
      <Input
        ref={phoneRef}
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        prefix={<span className="text-[15px] font-medium text-ink-600">+91</span>}
        className="pl-14"
        placeholder="98200 12345"
        maxLength={14}
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={errors.phone}
        hint={lockOrderId ? "Enter the number used when placing this order" : undefined}
      />
      {lookupError && <ErrorState inline title="Order not found" message={lookupError} />}
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Finding your order…" trailingIcon={<ArrowRight className="size-5" aria-hidden="true" />}>
        {submitLabel}
      </Button>
    </form>
  );
}
