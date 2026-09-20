"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { getErrorMessage } from "@/lib/errors";
import { isValidEmail } from "@/lib/validation";
import { customerService } from "@/services";
import { GoogleSignInButton, OrDivider } from "./GoogleSignInButton";

const MIN_PASSWORD_LENGTH = 8;

export function SignupForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string | undefined> = {};
    if (name.trim().length < 2) next.name = "Enter your full name.";
    if (!isValidEmail(email)) next.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD_LENGTH) next.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    setErrors(next);
    setFormError(null);
    if (Object.values(next).some(Boolean)) return;

    setPending(true);
    try {
      await customerService.register({ name, email, password });
      setSent(true);
    } catch (error) {
      setFormError(getErrorMessage(error));
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
          If that address can be registered, we&apos;ve sent a confirmation link to <strong className="text-ink-800">{email}</strong>. Click
          it to activate your account — the link lasts 24 hours.
        </p>
        <p className="mt-4 text-sm text-ink-500">In a hurry? You can order right away using your mobile number instead.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href="/login?mode=email">Back to login</ButtonLink>
          <ButtonLink href="/login" variant="outline">
            Use mobile number
          </ButtonLink>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">Create your account</h1>
      <p className="mt-1.5 text-[15px] text-ink-500">
        You&apos;ll verify a mobile number before your first order — your laundry partner needs a number to reach you.
      </p>

      {googleEnabled && (
        <>
          <GoogleSignInButton next={next && next.startsWith("/") && !next.startsWith("//") ? next : "/account"} label="Sign up with Google" className="mt-6" />
          <OrDivider />
          <p className="-mt-2 text-sm text-ink-500">Or use your email — we&apos;ll send a link to confirm the address.</p>
        </>
      )}

      <form noValidate onSubmit={submit} className={googleEnabled ? "mt-4 space-y-4" : "mt-6 space-y-4"}>
        <Input label="Full name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters`}
        />
        {formError && <ErrorState inline title="Couldn't create your account" message={formError} />}
        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Creating account…">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href={next ? `/login?mode=email&next=${encodeURIComponent(next)}` : "/login?mode=email"} className="font-semibold text-brand-700 underline underline-offset-4">
          Log in
        </Link>
      </p>
    </Card>
  );
}
