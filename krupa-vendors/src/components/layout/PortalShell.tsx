"use client";

import { LogOut, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";
import { Logo } from "@/components/ui/Logo";
import { useSession } from "@/state/SessionProvider";

/** Signed-in frame: header with the partner's name, and a redirect to /login otherwise. */
export function PortalShell({ children }: { children: ReactNode }) {
  const { status, user, signOut } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "ready" && !user) router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }, [status, user, router]);

  if (status === "loading" || !user) return <LoadingState title="Loading your portal…" className="py-32" />;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <Container className="flex h-16 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Logo href="/orders" />
            <span className="hidden rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-700 sm:inline">
              Partner
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden min-w-0 items-center gap-1.5 truncate text-sm font-semibold text-ink-700 sm:flex">
              <Store className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span className="truncate">{user.vendor.name}</span>
            </span>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Log out
            </button>
          </div>
        </Container>
      </header>
      {!user.vendor.isActive && (
        <div role="status" className="border-b border-sun-100 bg-sun-50 px-4 py-2.5 text-center text-sm font-medium text-sun-700">
          {user.vendor.name} is paused — customers can&apos;t book you right now. You can still finish your current orders.
        </div>
      )}
      <main id="main" className="pb-16">
        {children}
      </main>
    </>
  );
}
