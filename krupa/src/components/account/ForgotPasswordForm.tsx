"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { isValidEmail } from "@/lib/validation";
import { customerService } from "@/services";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(undefined);
    setFormError(null);
    setPending(true);
    try {
      await customerService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <Card padding="lg" className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">Check your email</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-relaxed text-ink-500">
          If <strong className="text-ink-800">{email}</strong> has an account, a reset link is on its way. It lasts one hour
          and can be used once.
        </p>
        <ButtonLink href="/login?mode=email" className="mt-6">
          Back to login
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">Reset your password</h1>
      <p className="mt-1.5 text-[15px] text-ink-500">Enter your email address and we&apos;ll send you a link to choose a new password.</p>
      <form noValidate onSubmit={submit} className="mt-6 space-y-4">
        <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} autoFocus />
        {formError && <ErrorState inline title="Couldn't send the link" message={formError} />}
        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Sending link…">
          Email me a reset link
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-500">
        Remembered it?{" "}
        <Link href="/login?mode=email" className="font-semibold text-brand-700 underline underline-offset-4">
          Back to login
        </Link>
      </p>
    </Card>
  );
}
