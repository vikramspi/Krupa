"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { forwardRef, useRef, useState, type FormEvent } from "react";
import { Input, Textarea } from "@/components/ui/Input";
import { isValidEmail, isValidIndianMobile, normalizePhone } from "@/lib/validation";
import type { BookingLocation } from "@/types";
import type { CustomerDetailsDraft } from "@/state/bookingStore";

type FieldName = "name" | "phone" | "email" | "line1" | "line2";
type Errors = Partial<Record<FieldName, string>>;

const FIELD_LABELS: Record<FieldName, string> = {
  name: "Full name",
  phone: "Mobile number",
  email: "Email",
  line1: "Flat / house no. & building",
  line2: "Street / road",
};

function validate(values: CustomerDetailsDraft): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!values.phone.trim()) errors.phone = "Enter your mobile number.";
  else if (!isValidIndianMobile(values.phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  if (values.email.trim() && !isValidEmail(values.email)) errors.email = "Enter a valid email address, or leave it blank.";
  if (values.line1.trim().length < 3) errors.line1 = "Enter your flat or house number and building name.";
  if (values.line2.trim().length < 3) errors.line2 = "Enter your street or road name.";
  return errors;
}

interface CustomerDetailsFormProps {
  id: string;
  initialValues: CustomerDetailsDraft;
  location: BookingLocation;
  /** Whether to offer "save this address" (signed-in customers using a new address). */
  canSaveAddress: boolean;
  /** The order is placed against the verified number, so it can't be edited here. */
  lockPhone?: boolean;
  onSubmit: (values: CustomerDetailsDraft) => void;
}

export const CustomerDetailsForm = forwardRef<HTMLFormElement, CustomerDetailsFormProps>(function CustomerDetailsForm(
  { id, initialValues, location, canSaveAddress, lockPhone = false, onSubmit },
  ref,
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const fieldRefs = useRef<Partial<Record<FieldName, HTMLInputElement | null>>>({});

  const update = <K extends keyof CustomerDetailsDraft>(key: K, value: CustomerDetailsDraft[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // After the first submit attempt, re-validate as the customer fixes things.
    if (submitted) setErrors(validate(next));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSubmitted(true);
    const invalid = (Object.keys(FIELD_LABELS) as FieldName[]).filter((f) => nextErrors[f]);
    if (invalid.length > 0) {
      if (invalid.length > 1) summaryRef.current?.focus();
      else fieldRefs.current[invalid[0]]?.focus();
      return;
    }
    onSubmit({ ...values, phone: normalizePhone(values.phone), name: values.name.trim(), email: values.email.trim() });
  };

  const errorList = (Object.keys(FIELD_LABELS) as FieldName[]).filter((f) => errors[f]);
  const register = (name: FieldName) => (el: HTMLInputElement | null) => {
    fieldRefs.current[name] = el;
  };

  return (
    <form id={id} ref={ref} noValidate onSubmit={handleSubmit} className="space-y-8">
      {/* Honeypot: positioned off-screen and skipped by keyboard, so only bots fill it in.
          The server rejects any request where it has a value. */}
      <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input
          id={`${id}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.honeypot ?? ""}
          onChange={(e) => update("honeypot", e.target.value)}
        />
      </div>
      {errorList.length > 1 && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 focus:outline-none focus-visible:outline-2">
          <p className="font-semibold text-red-900">Please fix {errorList.length} fields to continue:</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-red-800">
            {errorList.map((field) => (
              <li key={field}>
                <button type="button" className="underline underline-offset-2" onClick={() => fieldRefs.current[field]?.focus()}>
                  {FIELD_LABELS[field]}
                </button>
                : {errors[field]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <fieldset className="space-y-4">
        <legend className="text-base font-bold text-ink-900">Contact details</legend>
        <Input
          ref={register("name")}
          label={FIELD_LABELS.name}
          name="name"
          autoComplete="name"
          value={values.name}
          onChange={(e) => update("name", e.target.value)}
          error={errors.name}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            ref={register("phone")}
            label={FIELD_LABELS.phone}
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            prefix={<span className="text-[15px] font-medium text-ink-600">+91</span>}
            className="pl-14"
            maxLength={14}
            value={values.phone}
            onChange={(e) => update("phone", e.target.value)}
            error={errors.phone}
            disabled={lockPhone}
            hint={lockPhone ? "Your verified number" : "Shared only with your pickup executive"}
            required
          />
          <Input
            ref={register("email")}
            label={FIELD_LABELS.email}
            name="email"
            type="email"
            autoComplete="email"
            optional
            value={values.email}
            onChange={(e) => update("email", e.target.value)}
            error={errors.email}
            hint="For your order receipt"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-bold text-ink-900">Pickup address</legend>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3">
          <p className="flex min-w-0 items-center gap-2 text-[15px] text-ink-700">
            <MapPin className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="truncate">
              <span className="sr-only">Area: </span>
              <strong className="font-semibold text-ink-900">{location.areaName}</strong>, {location.city} {location.pincode}
            </span>
          </p>
          <Link href="/book/location" className="shrink-0 text-sm font-semibold text-brand-700 underline underline-offset-4">
            Change<span className="sr-only"> area</span>
          </Link>
        </div>
        <Input
          ref={register("line1")}
          label={FIELD_LABELS.line1}
          name="line1"
          autoComplete="address-line1"
          placeholder="e.g. Flat 1203, Sea Breeze Apartments"
          value={values.line1}
          onChange={(e) => update("line1", e.target.value)}
          error={errors.line1}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            ref={register("line2")}
            label={FIELD_LABELS.line2}
            name="line2"
            autoComplete="address-line2"
            placeholder="e.g. Carter Road"
            value={values.line2}
            onChange={(e) => update("line2", e.target.value)}
            error={errors.line2}
            required
          />
          <Input
            label="Landmark"
            name="landmark"
            optional
            placeholder="e.g. Near the promenade"
            value={values.landmark}
            onChange={(e) => update("landmark", e.target.value)}
          />
        </div>
        <Textarea
          label="Pickup instructions"
          name="instructions"
          optional
          rows={3}
          maxLength={240}
          placeholder="e.g. Ring the bell twice, or leave with security"
          value={values.instructions}
          onChange={(e) => update("instructions", e.target.value)}
        />
        {canSaveAddress && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/50">
            <input
              type="checkbox"
              checked={values.saveAddress}
              onChange={(e) => update("saveAddress", e.target.checked)}
              className="mt-0.5 size-5 shrink-0 rounded accent-brand-600"
            />
            <span>
              <span className="block font-semibold text-ink-900">Save this address to my account</span>
              <span className="block text-sm text-ink-500">Book faster next time with one tap.</span>
            </span>
          </label>
        )}
      </fieldset>
    </form>
  );
});
