"use client";

import { UserRound } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { useSession } from "@/state/SessionProvider";
import { TrackOrderLookupForm } from "./TrackOrderLookupForm";

export function TrackLookupPanel() {
  const { customer } = useSession();

  return (
    <div className="max-w-2xl">
      <Card padding="lg">
        <h2 className="text-lg font-semibold tracking-tight text-ink-900">Find your order</h2>
        <p className="mt-1 text-[15px] text-ink-500">No login needed — just your order ID and the mobile number on the order.</p>
        <div className="mt-6">
          <TrackOrderLookupForm />
        </div>
        {customer && (
          <p className="mt-6 flex flex-wrap items-center gap-x-2 border-t border-line pt-5 text-[15px] text-ink-600">
            <UserRound className="size-4 text-ink-400" aria-hidden="true" />
            You&apos;re logged in.{" "}
            <Link href="/account" className="font-semibold text-brand-700 underline underline-offset-4">
              See all your orders
            </Link>
          </p>
        )}
      </Card>
    </div>
  );
}
