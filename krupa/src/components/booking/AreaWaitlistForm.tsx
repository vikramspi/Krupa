"use client";

import { BellRing } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";
import { locationService } from "@/services";

/** "Notify me when you launch here" capture for coming-soon and no-partner states. */
export function AreaWaitlistForm({ place, className }: { place: string; className?: string }) {
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string>();

  if (status === "done") {
    return (
      <p role="status" className={cn("flex items-start gap-2 text-[15px] font-semibold text-emerald-800", className)}>
        <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        You&apos;re on the list — we&apos;ll let you know as soon as a partner is available in {place}.
      </p>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-2 sm:flex-row sm:items-start", className)}
      onSubmit={async (event) => {
        event.preventDefault();
        setStatus("submitting");
        setError(undefined);
        try {
          await locationService.joinWaitlist({ area: place, contact });
          setStatus("done");
        } catch (err) {
          setError(getErrorMessage(err));
          setStatus("idle");
        }
      }}
    >
      <Input
        label="Email or mobile number for launch updates"
        hideLabel
        placeholder="Email or mobile for updates"
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        error={error}
        containerClassName="flex-1"
        autoComplete="email"
      />
      <Button type="submit" variant="dark" loading={status === "submitting"}>
        Notify me
      </Button>
    </form>
  );
}
