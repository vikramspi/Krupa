"use client";

import { Mail, Pencil, Phone, ShieldCheck, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { formatLongDate, formatPhone } from "@/lib/format";
import { customerService } from "@/services";
import type { Customer } from "@/types";

interface ProfileCardProps {
  customer: Customer;
  onUpdated: (customer: Customer) => void;
}

export function ProfileCard({ customer, onUpdated }: ProfileCardProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(customer.name);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof errors = {};
    if (name.trim().length < 2) nextErrors.name = "Enter your full name.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSaving(true);
    setSaveError(null);
    try {
      const updated = await customerService.updateProfile({ name });
      onUpdated(updated);
      setEditing(false);
      setSavedMessage(true);
    } catch (error) {
      setSaveError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="section" aria-labelledby="profile-title">
      <div className="flex items-center justify-between">
        <h2 id="profile-title" className="font-bold text-ink-900">
          Profile
        </h2>
        {!editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setName(customer.name);
              setErrors({});
              setSavedMessage(false);
              setEditing(true);
            }}
            leadingIcon={<Pencil className="size-4" aria-hidden="true" />}
          >
            Edit<span className="sr-only"> profile</span>
          </Button>
        )}
      </div>

      {editing ? (
        <form noValidate onSubmit={save} className="mt-4 space-y-4">
          <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
          <Input
            label="Mobile number"
            value={customer.phone ? formatPhone(customer.phone) : "Not verified yet"}
            disabled
            hint="Your verified number can't be changed here — contact support."
          />
          {saveError && <p role="alert" className="text-sm font-medium text-red-700">{saveError}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <>
          <dl className="mt-4 space-y-3 text-[15px]">
            <div className="flex items-center gap-3">
              <dt>
                <UserRound className="size-4 text-ink-400" aria-hidden="true" />
                <span className="sr-only">Name</span>
              </dt>
              <dd className="font-semibold text-ink-900">{customer.name}</dd>
            </div>
            <div className="flex items-center gap-3">
              <dt>
                <Phone className="size-4 text-ink-400" aria-hidden="true" />
                <span className="sr-only">Mobile number</span>
              </dt>
              <dd className={customer.phone ? "text-ink-700" : "text-ink-400"}>
                {customer.phone ? formatPhone(customer.phone) : "No mobile number yet"}
              </dd>
            </div>
            {customer.email && (
              <div className="flex items-center gap-3">
                <dt>
                  <Mail className="size-4 text-ink-400" aria-hidden="true" />
                  <span className="sr-only">Email</span>
                </dt>
                <dd className="text-ink-700">{customer.email}</dd>
              </div>
            )}
            <div className="flex items-center gap-3">
              <dt>
                <ShieldCheck className={customer.phone ? "size-4 text-emerald-600" : "size-4 text-amber-600"} aria-hidden="true" />
                <span className="sr-only">Verification</span>
              </dt>
              <dd className="text-ink-700">
                {customer.phone ? "Mobile number verified" : "Verify a mobile number to place orders"}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-ink-500">Member since {formatLongDate(customer.memberSince)}</p>
          {savedMessage && (
            <p role="status" className="mt-2 text-sm font-medium text-emerald-700">
              Profile updated.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
