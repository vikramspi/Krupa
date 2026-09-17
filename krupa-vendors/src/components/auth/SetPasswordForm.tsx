"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errors";
import { useSession } from "@/state/SessionProvider";
import type { VendorSessionUser } from "@/types";

/** Finishes an invite (first password) or a reset link. */
export function SetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const kind = params.get("kind") === "reset" ? "reset" : "invite";
  const token = params.get("token") ?? "";

  const link = useAsync(
    () => apiRequest<{ name: string; email: string | null }>(`/api/auth/password/link?kind=${kind}&token=${encodeURIComponent(token)}`),
    `link:${kind}:${token}`,
    { enabled: token.length > 0 },
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token || link.status === "error") {
    return (
      <Card padding="lg" className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">This link can&apos;t be used</h1>
        <p className="mt-2 text-[15px] text-ink-500">
          {kind === "invite"
            ? "It has expired or was already used. Ask Krupa Laundry to send you a new invite."
            : "It has expired or was already used. You can request a new one."}
        </p>
        <ButtonLink href={kind === "invite" ? "/login" : "/forgot-password"} className="mt-6">
          {kind === "invite" ? "Go to login" : "Request a new link"}
        </ButtonLink>
      </Card>
    );
  }
  if (link.status !== "success" || !link.data) return <LoadingState className="py-16" />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = {
      password: password.length >= 8 ? undefined : "Use at least 8 characters.",
      confirm: confirm === password ? undefined : "The passwords don't match.",
    };
    setErrors(next);
    setError(null);
    if (next.password || next.confirm) return;
    setPending(true);
    try {
      const { user } = await apiRequest<{ user: VendorSessionUser }>("/api/auth/password/set", {
        method: "POST",
        body: JSON.stringify({ kind, token, password }),
      });
      session.setUser(user);
      router.replace("/orders");
    } catch (err) {
      setError(getErrorMessage(err));
      setPending(false);
    }
  };

  return (
    <Card padding="lg">
      <h1 className="text-2xl font-bold tracking-tight">{kind === "invite" ? `Welcome, ${link.data.name.split(" ")[0]}` : "Choose a new password"}</h1>
      <p className="mt-1.5 text-[15px] text-ink-500">
        {kind === "invite" ? "Set a password to activate your partner login" : "Set a new password for"}
        {link.data.email ? (
          <>
            {" "}
            (<strong className="text-ink-800">{link.data.email}</strong>).
          </>
        ) : (
          "."
        )}
      </p>
      <form noValidate onSubmit={submit} className="mt-6 space-y-4">
        {link.data.email && <input type="email" autoComplete="username" value={link.data.email} readOnly hidden />}
        <Input label="New password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} hint="At least 8 characters" />
        <Input label="Confirm password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
        {error && <ErrorState inline title="Couldn't save your password" message={error} />}
        <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Saving…">
          {kind === "invite" ? "Activate & log in" : "Save & log in"}
        </Button>
      </form>
    </Card>
  );
}
