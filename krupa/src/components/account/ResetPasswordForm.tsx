"use client";

import { CheckCircle2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { customerService } from "@/services";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <Card padding="lg">
        <EmptyState
          title="This reset link is incomplete"
          description="Open the link straight from the email, or request a new one."
          actions={<ButtonLink href="/forgot-password">Request a new link</ButtonLink>}
          headingLevel="h2"
        />
      </Card>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string | undefined> = {};
    if (password.length < MIN_PASSWORD_LENGTH) next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirm !== password) next.confirm = "Both passwords must match.";
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;

    setPending(true);
    try {
      await customerService.resetPassword(token, password);
      setDone(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <Card padding="lg" className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700" aria-hidden="true">
          <CheckCircle2 className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink-900">Password updated</h1>
        <p className="mt-2 text-[15px] text-ink-500">You can now log in with your new password.</p>
        <ButtonLink href="/login?mode=email" className="mt-6">
          Go to login
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[1.75rem]">Choose a new password</h1>
      <p className="mt-1.5 text-[15px] text-ink-500">This link works once. Your old password stays active until you finish here.</p>
      <form noValidate onSubmit={submit} className="mt-6 space-y-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
          autoFocus
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
        />
        {formError && <ErrorState inline title="Couldn't reset your password" message={formError} />}
        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Saving…">
          Save new password
        </Button>
      </form>
    </Card>
  );
}
