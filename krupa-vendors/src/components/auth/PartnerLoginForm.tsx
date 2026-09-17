"use client";

import { ArrowRight, Mail, Smartphone, Terminal } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { apiRequest } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/format";
import { isValidEmail, isValidIndianMobile, normalizePhone } from "@/lib/validation";
import * as smsWidget from "@/services/msg91Widget";
import { useSession } from "@/state/SessionProvider";
import type { VendorSessionUser } from "@/types";

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/orders";
}

interface Props {
  /** MSG91 widget settings; without them local development uses a code shown on screen. */
  smsWidgetConfig: smsWidget.WidgetConfig | null;
}

/** Partner sign-in: mobile number (SMS code) or email + password. */
export function PartnerLoginForm({ smsWidgetConfig }: Props) {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const session = useSession();
  const [mode, setMode] = useState<"phone" | "email">("phone");

  useEffect(() => {
    if (session.status === "ready" && session.user) router.replace(next);
  }, [session.status, session.user, router, next]);

  if (session.status === "loading" || session.user) return <LoadingState className="py-24" />;

  const done = (user: VendorSessionUser) => {
    session.setUser(user);
    router.replace(next);
  };

  return (
    <Card padding="lg">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">Partner portal</p>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-900">Log in to manage your orders</h1>
      <p className="mt-1.5 text-[15px] text-ink-500">Use the mobile number or email Krupa Laundry registered for your shop.</p>

      <div role="tablist" aria-label="Login method" className="mt-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-ink-100 p-1.5">
        {([
          { id: "phone", label: "Mobile number", icon: Smartphone },
          { id: "email", label: "Email", icon: Mail },
        ] as const).map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={mode === option.id}
            onClick={() => setMode(option.id)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold",
              mode === option.id ? "bg-white text-ink-900 shadow-card" : "text-ink-600 hover:text-ink-900",
            )}
          >
            <option.icon className={cn("size-4", mode === option.id ? "text-brand-600" : "text-ink-400")} aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>

      {/* Both stay mounted so MSG91's captcha survives switching tabs. */}
      <div className={mode === "phone" ? undefined : "hidden"}>
        <PhoneLogin smsWidgetConfig={smsWidgetConfig} visible={mode === "phone"} onDone={done} />
      </div>
      {mode === "email" && <EmailLogin onDone={done} />}
    </Card>
  );
}

function PhoneLogin({ smsWidgetConfig, visible, onDone }: Props & { visible: boolean; onDone: (user: VendorSessionUser) => void }) {
  const useWidget = Boolean(smsWidgetConfig);
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [captchaEl, setCaptchaEl] = useState<HTMLDivElement | null>(null);
  const [widgetState, setWidgetState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!smsWidgetConfig || !captchaEl || !visible || step !== "phone") return;
    let cancelled = false;
    smsWidget
      .initWidget(smsWidgetConfig, captchaEl)
      .then(() => !cancelled && setWidgetState("ready"))
      .catch((err) => {
        if (cancelled) return;
        setWidgetState("error");
        setError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [smsWidgetConfig, captchaEl, visible, step]);

  const codeLength = useWidget && widgetState === "ready" ? smsWidget.widgetSettings().otpLength : 6;

  const send = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isValidIndianMobile(phone)) {
      setFieldError("Enter a valid 10-digit mobile number.");
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      const digits = normalizePhone(phone);
      // Refuse unregistered numbers before any SMS is sent.
      await apiRequest("/api/auth/phone", { method: "POST", body: JSON.stringify({ phone: digits }) });
      if (useWidget) {
        const sent = await smsWidget.sendCode(digits);
        if (sent.accessToken) {
          const { user } = await apiRequest<{ user: VendorSessionUser }>("/api/auth/otp/widget", {
            method: "POST",
            body: JSON.stringify({ phone: digits, accessToken: sent.accessToken }),
          });
          return onDone(user);
        }
      } else {
        const res = await apiRequest<{ devCode: string }>("/api/auth/otp", { method: "POST", body: JSON.stringify({ phone: digits }) });
        setDevCode(res.devCode);
      }
      setCode("");
      setStep("code");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (code.length !== codeLength) {
      setFieldError(`Enter the ${codeLength}-digit code.`);
      return;
    }
    setFieldError(undefined);
    setPending(true);
    try {
      const digits = normalizePhone(phone);
      const { user } = useWidget
        ? await apiRequest<{ user: VendorSessionUser }>("/api/auth/otp/widget", {
            method: "POST",
            body: JSON.stringify({ phone: digits, accessToken: await smsWidget.verifyCode(code) }),
          })
        : await apiRequest<{ user: VendorSessionUser }>("/api/auth/otp/verify", {
            method: "POST",
            body: JSON.stringify({ phone: digits, code }),
          });
      onDone(user);
    } catch (err) {
      setError(getErrorMessage(err));
      setPending(false);
    }
  };

  return (
    <div className="mt-6">
      {step === "phone" ? (
        <form id="partner-phone-form" noValidate onSubmit={send} className="space-y-4">
          <Input
            label="Registered mobile number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            prefix={<span className="text-[15px] font-medium text-ink-600">+91</span>}
            className="pl-14"
            placeholder="98200 12345"
            maxLength={14}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldError}
          />
          {error && <ErrorState inline title="Couldn't send code" message={error} />}
        </form>
      ) : (
        <form noValidate onSubmit={verify} className="space-y-4">
          <p className="text-[15px] text-ink-500">We sent a code to {formatPhone(normalizePhone(phone))}.</p>
          {devCode && (
            <Alert tone="warning" title="Development mode — no SMS sent" role="note">
              <span className="inline-flex items-start gap-1.5">
                <Terminal className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  Your code is <strong className="font-mono tracking-widest">{devCode}</strong>
                </span>
              </span>
            </Alert>
          )}
          <Input
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={codeLength}
            className="font-mono tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={fieldError}
            autoFocus
          />
          {error && <ErrorState inline title="Couldn't verify" message={error} />}
          <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Verifying…">
            Verify &amp; log in
          </Button>
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setError(null);
            }}
            className="text-sm font-semibold text-ink-600 underline underline-offset-4 hover:text-ink-900"
          >
            Change number
          </button>
        </form>
      )}
      {useWidget && (
        <div
          id={smsWidget.MSG91_CAPTCHA_ID}
          ref={setCaptchaEl}
          className={cn("relative flex justify-center overflow-x-auto empty:hidden [&_iframe]:max-w-full", step === "phone" ? "mt-4" : "hidden")}
        />
      )}
      {step === "phone" && (
        <Button
          form="partner-phone-form"
          type="submit"
          size="lg"
          fullWidth
          className="mt-4"
          disabled={useWidget && widgetState !== "ready"}
          loading={pending}
          loadingText="Sending code…"
          trailingIcon={<ArrowRight className="size-5" aria-hidden="true" />}
        >
          {useWidget && widgetState === "loading" ? "Preparing verification…" : "Send verification code"}
        </Button>
      )}
    </div>
  );
}

function EmailLogin({ onDone }: { onDone: (user: VendorSessionUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = { email: isValidEmail(email) ? undefined : "Enter a valid email address.", password: password ? undefined : "Enter your password." };
    setErrors(next);
    setError(null);
    if (next.email || next.password) return;
    setPending(true);
    try {
      const { user } = await apiRequest<{ user: VendorSessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onDone(user);
    } catch (err) {
      setError(getErrorMessage(err));
      setPending(false);
    }
  };

  return (
    <form noValidate onSubmit={submit} className="mt-6 space-y-4">
      <Input label="Email address" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
      <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
      {error && <ErrorState inline title="Couldn't log you in" message={error} />}
      <Button type="submit" size="lg" fullWidth loading={pending} loadingText="Logging in…">
        Log in
      </Button>
      <p className="text-sm">
        <Link href="/forgot-password" className="font-semibold text-ink-600 underline underline-offset-4 hover:text-ink-900">
          Forgot password?
        </Link>
      </p>
      <p className="text-sm text-ink-500">First time? Use the invite link Krupa Laundry emailed you to set your password.</p>
    </form>
  );
}
