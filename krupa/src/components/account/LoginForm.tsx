"use client";

import { LogOut, Mail, MessageSquareText, Smartphone, Terminal, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { LoadingState } from "@/components/ui/LoadingState";
import { cn } from "@/lib/cn";
import { getErrorMessage, isServiceError } from "@/lib/errors";
import { formatPhone } from "@/lib/format";
import { isValidEmail, isValidIndianMobile, normalizePhone } from "@/lib/validation";
import { customerService, type SignInChallenge, type VerifyResult } from "@/services";
import * as smsWidget from "@/services/msg91Widget";
import { GoogleSignInButton, OrDivider } from "./GoogleSignInButton";
import { useSession } from "@/state/SessionProvider";

const RESEND_SECONDS = 30;

function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/account";
}

const VERIFY_BANNERS = {
  success: { tone: "success", title: "Email confirmed", body: "You can now log in with your email and password." },
  expired: { tone: "warning", title: "That link has expired", body: "Confirmation links last 24 hours — sign up again to get a fresh one." },
  invalid: { tone: "warning", title: "That link is no longer valid", body: "It may already have been used. Try logging in, or sign up again." },
} as const;

const GOOGLE_BANNERS = {
  cancelled: { tone: "info", title: "Google sign-in cancelled", body: "No problem — choose another way to log in, or try Google again." },
  expired: { tone: "warning", title: "Google sign-in timed out", body: "Please start again with Continue with Google." },
  unverified: { tone: "warning", title: "That Google email isn't verified", body: "Verify the address with Google first, or log in another way." },
  conflict: {
    tone: "warning",
    title: "This email is linked to a different Google account",
    body: "Log in with the Google account you used before, or use your mobile number.",
  },
  rate_limited: { tone: "warning", title: "Too many attempts", body: "Please wait a little and try again." },
  unavailable: { tone: "warning", title: "Google sign-in isn't available right now", body: "Please log in with your mobile number or email." },
  error: { tone: "warning", title: "We couldn't sign you in with Google", body: "Please try again, or log in another way." },
} as const;

/** The MSG91 widget's expiry is set in its dashboard, so the UI doesn't state one. */
const WIDGET_CHALLENGE: SignInChallenge = {
  codeRequired: true,
  channel: "sms",
  expiresInMinutes: 0,
  isExistingCustomer: false,
  hasName: false,
  devDelivery: false,
};

interface LoginFormProps {
  googleEnabled?: boolean;
  /** MSG91 OTP Widget settings; without them the dev-only server OTP is used. */
  smsWidgetConfig?: smsWidget.WidgetConfig | null;
}

/**
 * Three doors into the same session: phone OTP, email + password, and Google. All
 * set the identical signed cookie, so everything downstream behaves the same.
 */
export function LoginForm({ googleEnabled = false, smsWidgetConfig = null }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const verifyBanner = VERIFY_BANNERS[searchParams.get("verify") as keyof typeof VERIFY_BANNERS];
  const googleBanner = GOOGLE_BANNERS[searchParams.get("google") as keyof typeof GOOGLE_BANNERS];
  const session = useSession();

  const [mode, setMode] = useState<"phone" | "email">(searchParams.get("mode") === "email" ? "email" : "phone");
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [challenge, setChallenge] = useState<SignInChallenge | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<"request" | "verify" | "login" | "resend" | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [captchaEl, setCaptchaEl] = useState<HTMLDivElement | null>(null);
  const [widgetState, setWidgetState] = useState<"loading" | "ready" | "error">("loading");
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const useWidget = Boolean(smsWidgetConfig);
  const codeLength = useWidget && widgetState === "ready" ? smsWidget.widgetSettings().otpLength : 6;
  const phoneStepVisible = step === "phone" && (mode === "phone" || Boolean(session.customer && !session.customer.phone));

  // Load MSG91 as soon as the phone form is on screen, so its captcha is ready to tick.
  useEffect(() => {
    if (!smsWidgetConfig || !captchaEl || !phoneStepVisible) return;
    let cancelled = false;
    smsWidget
      .initWidget(smsWidgetConfig, captchaEl)
      .then(() => !cancelled && setWidgetState("ready"))
      .catch((error) => {
        if (cancelled) return;
        setWidgetState("error");
        setWidgetError(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [smsWidgetConfig, captchaEl, phoneStepVisible]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const requestCode = async (event?: FormEvent) => {
    event?.preventDefault();
    setFormError(null);
    if (!isValidIndianMobile(phone)) {
      setFieldError({ phone: "Enter a valid 10-digit mobile number." });
      return;
    }
    setFieldError({});
    setPending("request");
    try {
      let retrySeconds = RESEND_SECONDS;
      if (useWidget) {
        if (captchaEl) await smsWidget.initWidget(smsWidgetConfig!, captchaEl);
        const sent = await smsWidget.sendCode(normalizePhone(phone));
        // Invisible verification already confirmed the number: no code to type.
        if (sent.accessToken) return await finishSignIn(customerService.verifyWidgetToken(phone, sent.accessToken));
        const settings = smsWidget.widgetSettings();
        retrySeconds = settings.retrySeconds;
        setChallenge({ ...WIDGET_CHALLENGE, expiresInMinutes: settings.expiryMinutes });
      } else {
        setChallenge(await customerService.requestOtp(phone));
      }
      setCode("");
      setStep("code");
      setResendIn(retrySeconds);
      requestAnimationFrame(() => codeRef.current?.focus());
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  /** Shared tail of every phone sign-in: store the customer, then ask for a name or move on. */
  const finishSignIn = async (verification: Promise<VerifyResult>) => {
    const result = await verification;
    session.setCustomer(result.customer);
    if (result.needsName) {
      setStep("name");
      requestAnimationFrame(() => nameRef.current?.focus());
      return;
    }
    router.replace(next);
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (code.length !== codeLength) {
      setFieldError({ code: `Enter the ${codeLength}-digit code we texted you.` });
      return;
    }
    setFieldError({});
    setPending("verify");
    try {
      await finishSignIn(
        useWidget
          ? customerService.verifyWidgetToken(phone, await smsWidget.verifyCode(code))
          : customerService.verifyOtp(phone, code),
      );
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const submitName = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (name.trim().length < 2) {
      setFieldError({ name: "Tell us your name so partners know who they're collecting from." });
      return;
    }
    setPending("verify");
    try {
      session.setCustomer(await customerService.updateProfile({ name }));
      router.replace(next);
    } catch (error) {
      setFormError(getErrorMessage(error));
      setPending(null);
    }
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const errors: Record<string, string | undefined> = {};
    if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldError(errors);
    if (Object.values(errors).some(Boolean)) return;

    setPending("login");
    setUnverifiedEmail(null);
    setResendMessage(null);
    try {
      session.setCustomer(await customerService.login(email, password));
      router.replace(next);
    } catch (error) {
      setFormError(getErrorMessage(error));
      if (isServiceError(error) && error.apiCode === "email_unverified") setUnverifiedEmail(email);
      setPending(null);
    }
  };

  const resendVerification = async () => {
    if (!unverifiedEmail) return;
    setPending("resend");
    try {
      await customerService.resendVerification(unverifiedEmail);
      setResendMessage(`We've sent a new confirmation link to ${unverifiedEmail}. Check your inbox and spam folder.`);
    } catch (error) {
      setResendMessage(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const resend = async () => {
    if (!useWidget) return requestCode();
    setFormError(null);
    setPending("request");
    try {
      await smsWidget.resendCode();
      setResendIn(smsWidget.widgetSettings().retrySeconds);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setPending(null);
    }
  };

  const phoneFormId = "phone-otp-form";
  const widgetLoading = useWidget && widgetState !== "ready" && widgetState !== "error";

  /** Phone number → code, shared by "log in" and "add a number to this account". */
  const phoneSteps = (intro: ReactNode) => (
    <div className="mt-6">
      {step !== "code" ? (
        <form id={phoneFormId} noValidate onSubmit={requestCode} className="space-y-4">
          {intro}
          <Input
            label="Mobile number"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            prefix={<span className="text-[15px] font-medium text-ink-600">+91</span>}
            className="pl-14"
            placeholder="98200 12345"
            maxLength={14}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldError.phone}
          />
          {widgetState === "error" && (
            <ErrorState inline title="Phone verification didn't load" message={widgetError ?? "Please refresh the page and try again."} />
          )}
          {formError && <ErrorState inline title="Couldn't send code" message={formError} />}
        </form>
      ) : (
        <form noValidate onSubmit={submitCode} className="space-y-4">
          <p className="text-[15px] text-ink-500">
            We sent a code to {formatPhone(normalizePhone(phone))}.
            {challenge?.expiresInMinutes ? ` It expires in ${challenge.expiresInMinutes} minutes.` : ""}
          </p>
          {challenge?.devDelivery && <DevCodeNotice challenge={challenge} />}
          <Input
            ref={codeRef}
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={codeLength}
            placeholder={"•".repeat(codeLength)}
            className="font-mono tracking-[0.4em]"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            error={fieldError.code}
          />
          {formError && <ErrorState inline title="Couldn't verify" message={formError} />}
          <Button type="submit" size="lg" fullWidth loading={pending === "verify"} loadingText="Verifying…">
            Verify &amp; continue
          </Button>
          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setFormError(null);
              }}
              className="font-semibold text-ink-600 underline underline-offset-4 hover:text-ink-900"
            >
              Change number
            </button>
            <button
              type="button"
              disabled={resendIn > 0 || pending !== null}
              onClick={() => void resend()}
              className="inline-flex items-center gap-1.5 font-semibold text-brand-700 disabled:cursor-not-allowed disabled:text-ink-400"
            >
              <MessageSquareText className="size-4" aria-hidden="true" />
              {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
      {/* MSG91 renders its captcha here. Hidden, never unmounted, once the code is sent. */}
      {useWidget && (
        <div
          id={smsWidget.MSG91_CAPTCHA_ID}
          ref={setCaptchaEl}
          className={cn("relative flex justify-center overflow-x-auto empty:hidden [&_iframe]:max-w-full", step === "phone" ? "mt-4" : "hidden")}
        />
      )}
      {step !== "code" && (
        <Button
          form={phoneFormId}
          type="submit"
          size="lg"
          fullWidth
          className="mt-4"
          disabled={widgetLoading || widgetState === "error"}
          loading={pending === "request"}
          loadingText="Sending code…"
        >
          {widgetLoading ? "Preparing verification…" : "Send verification code"}
        </Button>
      )}
    </div>
  );

  if (session.status === "loading") return <LoadingState />;

  const customer = session.customer;

  // Signed in, but no verified number yet (email account): the phone is what's missing.
  if (customer && !customer.phone && step !== "name") {
    return (
      <Card padding="lg">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">
          <Smartphone className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">Verify your mobile number</h1>
        <p className="mt-1.5 text-[15px] text-ink-500">
          You&apos;re signed in as {customer.email ?? customer.name}. A verified number is required before you can place an
          order — we&apos;ll add it to this account.
        </p>
        {phoneSteps(null)}
        <button
          type="button"
          onClick={() => void session.signOut()}
          className="mt-6 text-sm font-semibold text-ink-600 underline underline-offset-4 hover:text-ink-900"
        >
          Log out
        </button>
      </Card>
    );
  }

  if (customer && step !== "name") {
    return (
      <Card padding="lg" className="text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700" aria-hidden="true">
          <UserRound className="size-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink-900">
          You&apos;re logged in as {customer.name || formatPhone(customer.phone ?? "")}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-500">Pick up where you left off.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <ButtonLink href={next}>Continue</ButtonLink>
          <Button variant="outline" onClick={() => void session.signOut()} leadingIcon={<LogOut className="size-4" aria-hidden="true" />}>
            Log out
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      {verifyBanner && (
        <Alert tone={verifyBanner.tone} title={verifyBanner.title} className="mb-6" role="status">
          {verifyBanner.body}
        </Alert>
      )}
      {googleBanner && step !== "name" && (
        <Alert tone={googleBanner.tone} title={googleBanner.title} className="mb-6" role="alert">
          {googleBanner.body}
        </Alert>
      )}

      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">
        {step === "name" ? "One last thing" : "Log in or sign up"}
      </h1>

      {step === "name" ? (
        <>
          <p className="mt-1.5 text-[15px] text-ink-500">Tell us your name so your laundry partner knows who to ask for.</p>
          <form noValidate onSubmit={submitName} className="mt-6 space-y-4">
            <Input ref={nameRef} label="Your name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={fieldError.name} />
            {formError && <ErrorState inline title="Couldn't save your name" message={formError} />}
            <Button type="submit" size="lg" fullWidth loading={pending === "verify"} loadingText="Saving…">
              Create account
            </Button>
          </form>
        </>
      ) : (
        <>
          {googleEnabled && (
            <>
              <GoogleSignInButton next={next} className="mt-6" />
              <OrDivider />
            </>
          )}
          <div role="tablist" aria-label="Sign-in method" className={cn(googleEnabled ? "" : "mt-5", "grid grid-cols-2 gap-1.5 rounded-2xl bg-ink-100 p-1.5")}>
            {([
              { id: "phone", label: "Mobile number", icon: Smartphone },
              { id: "email", label: "Email", icon: Mail },
            ] as const).map((option) => (
              <button
                key={option.id}
                type="button"
                role="tab"
                aria-selected={mode === option.id}
                onClick={() => {
                  setMode(option.id);
                  setFormError(null);
                  setFieldError({});
                }}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow]",
                  mode === option.id ? "bg-white text-ink-900 shadow-card" : "text-ink-600 hover:text-ink-900",
                )}
              >
                <option.icon className={cn("size-4", mode === option.id ? "text-brand-600" : "text-ink-400")} aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>

          {/* Kept mounted while the email tab is open so MSG91's captcha isn't torn down. */}
          <div className={mode === "phone" ? undefined : "hidden"}>
            {phoneSteps(
              <p className="text-[15px] text-ink-500">We&apos;ll text you a one-time code. A verified number is required to place an order.</p>,
            )}
          </div>
          {mode === "email" && (
            <form noValidate onSubmit={submitLogin} className="mt-6 space-y-4">
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldError.email}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldError.password}
              />
              {formError && <ErrorState inline title="Couldn't log you in" message={formError} />}
              {unverifiedEmail && (
                <div className="rounded-2xl border border-line bg-ink-50 p-4 text-sm text-ink-700">
                  {resendMessage ?? "Didn't get the email, or the link expired?"}
                  {!resendMessage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      loading={pending === "resend"}
                      loadingText="Sending…"
                      onClick={() => void resendVerification()}
                    >
                      Resend confirmation email
                    </Button>
                  )}
                </div>
              )}
              <Button type="submit" size="lg" fullWidth loading={pending === "login"} loadingText="Logging in…">
                Log in
              </Button>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link href="/forgot-password" className="font-semibold text-ink-600 underline underline-offset-4 hover:text-ink-900">
                  Forgot password?
                </Link>
                <Link href={`/signup?next=${encodeURIComponent(next)}`} className="font-semibold text-brand-700 underline underline-offset-4">
                  Create an account
                </Link>
              </div>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

/** Local development only: SMS isn't connected, so show the code instead of texting it. */
function DevCodeNotice({ challenge }: { challenge: SignInChallenge }) {
  return (
    <Alert tone="warning" title="Development mode — no SMS sent" role="note">
      <span className="inline-flex items-start gap-1.5">
        <Terminal className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          MSG91 isn&apos;t connected yet.{" "}
          {challenge.devCode ? (
            <>
              Your code is <strong className="font-mono tracking-widest">{challenge.devCode}</strong>
            </>
          ) : (
            "The code was printed to the server console."
          )}
        </span>
      </span>
    </Alert>
  );
}
