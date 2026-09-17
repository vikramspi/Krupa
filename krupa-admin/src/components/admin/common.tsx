"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { ADMIN_STATUS } from "@/lib/adminStatus";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import type { ActivityItem, OrderStatus } from "@/types";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-[15px] text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = ADMIN_STATUS[status];
  return (
    <Badge tone={meta.tone}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {meta.label}
    </Badge>
  );
}

export function StatCard({ label, value, hint, tone = "neutral", href }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "neutral" | "warning"; href?: string }) {
  const body = (
    <>
      <p className="text-sm font-medium text-ink-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint && <p className={cn("mt-1 text-sm", tone === "warning" ? "font-semibold text-sun-700" : "text-ink-500")}>{hint}</p>}
    </>
  );
  const className = cn("block rounded-3xl border bg-white p-5 shadow-card", tone === "warning" ? "border-sun-300" : "border-line", href && "hover:shadow-raised");
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function Pager({ page, total, pageSize = 25, onPage }: { page: number; total: number; pageSize?: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-4 text-sm text-ink-500">{total} total</p>;
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-ink-500">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 font-semibold disabled:opacity-40">
          <ChevronLeft className="size-4" aria-hidden="true" /> Previous
        </button>
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="inline-flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 font-semibold disabled:opacity-40">
          Next <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

const ACTOR_TONE: Record<ActivityItem["actorType"], string> = {
  customer: "bg-sky-100 text-sky-800",
  vendor: "bg-brand-100 text-brand-800",
  admin: "bg-ink-900 text-white",
  system: "bg-ink-100 text-ink-600",
};

function entityHref(item: ActivityItem): string | null {
  if (!item.entityId) return null;
  if (item.entityType === "order") return `/orders/${item.entityId}`;
  if (item.entityType === "vendor") return `/vendors/${item.entityId}`;
  if (item.entityType === "customer") return `/customers/${item.entityId}`;
  return null;
}

export function ActivityList({ items, empty = "No activity yet." }: { items: ActivityItem[]; empty?: string }) {
  if (items.length === 0) return <p className="py-6 text-center text-[15px] text-ink-500">{empty}</p>;
  return (
    <ol className="divide-y divide-line">
      {items.map((item) => {
        const href = entityHref(item);
        return (
          <li key={item.id} className="flex items-start gap-3 py-3">
            <span className={cn("mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide", ACTOR_TONE[item.actorType])}>{item.actorType}</span>
            <div className="min-w-0 flex-1">
              <p className="break-words text-[15px] text-ink-800">
                {href ? (
                  <Link href={href} className="hover:underline">
                    {item.summary}
                  </Link>
                ) : (
                  item.summary
                )}
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
                <time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time>
                {item.actorLabel && ` · ${item.actorLabel}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-line bg-white p-5 shadow-card", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Reads the admin list filters from the URL so views are shareable and survive reloads. */
export function setParam(params: URLSearchParams, key: string, value: string | null): string {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "page") next.delete("page");
  const query = next.toString();
  return query ? `?${query}` : "";
}
