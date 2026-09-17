"use client";

import { Activity, LayoutDashboard, LogOut, Menu, MessageSquareQuote, Package, Store, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { LogoMark } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";
import { useAdmin } from "@/state/AdminSession";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: Package },
  { href: "/vendors", label: "Vendors", icon: Store },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reviews", label: "Reviews", icon: MessageSquareQuote },
  { href: "/activity", label: "Activity", icon: Activity },
];

const isCurrent = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function AdminShell({ children }: { children: ReactNode }) {
  const { status, admin, signOut } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === pathname;

  useEffect(() => {
    if (status === "ready" && !admin) router.replace("/login");
  }, [status, admin, router]);

  if (status === "loading" || !admin) return <LoadingState title="Checking your admin session…" className="py-32" />;

  const nav = (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isCurrent(pathname, href) ? "page" : undefined}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink-300 hover:bg-white/10 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:text-white"
        >
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 pt-4">
      <p className="truncate text-sm font-semibold text-white">{admin.name ?? "Admin"}</p>
      <p className="truncate text-xs text-ink-400">{admin.email}</p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-300 hover:bg-white/10 hover:text-white"
      >
        <LogOut className="size-4" aria-hidden="true" />
        Sign out
      </button>
    </div>
  );

  const brand = (
    <Link href="/" className="flex items-center gap-2.5">
      <LogoMark className="size-8 text-brand-500" />
      <span className="text-[15px] font-bold text-white">
        Krupa <span className="font-medium text-ink-400">admin</span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between bg-ink-950 p-4 lg:flex">
        <div className="space-y-6">
          {brand}
          {nav}
        </div>
        {account}
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink-950 px-4 lg:hidden">
        {brand}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuFor(menuOpen ? null : pathname)}
          className="flex size-10 items-center justify-center rounded-full text-white hover:bg-white/10"
        >
          {menuOpen ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
        </button>
      </header>
      <div id="admin-mobile-nav" hidden={!menuOpen} className="fixed inset-x-0 bottom-0 top-14 z-30 space-y-6 overflow-y-auto bg-ink-950 p-4 lg:hidden">
        {nav}
        {account}
      </div>

      <main id="main" className={cn("min-w-0 px-4 pb-16 pt-6 sm:px-6 lg:px-10 lg:pt-8")}>{children}</main>
    </div>
  );
}
