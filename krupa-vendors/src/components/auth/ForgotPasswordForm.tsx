"use client";

import { MailCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { apiRequest } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errors";
import { isValidEmail } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setFieldError(undefined);
    setError(null);
    setPending(true);
    try {
      await apiRequest("/api/auth/password/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <Card padding="lg" className="text-center">
        <MailCheck className="mx-auto size-10 text-brand-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="mt-2 text-[15px] text-ink-500">If {email} has a partner login, a reset link is on its way. It lasts one hour.</p>
        <ButtonLink href="/login" className="mt-6">
          Back to login
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-1.5 text-[15px] text-ink-500">Enter your login email and we&apos;ll send you a link to choose a new password.</p>
      <form noValidate onSubmit={submit} className="mt-6 space-y-4">
        <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldError} />
        {error && <ErrorState inline title="Couldn't send the link" message={error} />}
        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Sending…">
          Send reset link
        </Button>
        <ButtonLink href="/login" variant="ghost" fullWidth>
          Back to login
        </ButtonLink>
      </form>
    </Card>
  );
}
