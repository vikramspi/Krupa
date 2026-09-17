"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/LoadingState";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { getErrorMessage } from "@/lib/errors";
import type { ActivityItem } from "@/types";
import { ActivityList, PageHeader, Panel } from "./common";

type Actor = "" | ActivityItem["actorType"];
const FILTERS: { id: Actor; label: string }[] = [
  { id: "", label: "Everything" },
  { id: "customer", label: "Customers" },
  { id: "vendor", label: "Vendors" },
  { id: "admin", label: "Admin" },
  { id: "system", label: "System" },
];

interface Page {
  items: ActivityItem[];
  nextBefore: number | null;
}

export function ActivityLog() {
  const [actor, setActor] = useState<Actor>("");
  const first = useAsync(() => apiRequest<Page>(`/api/admin/activity${actor ? `?actor=${actor}` : ""}`), `activity:${actor}`);
  const [more, setMore] = useState<{ key: string; items: ActivityItem[]; nextBefore: number | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const extra = more && more.key === actor ? more : null;
  const items = [...(first.data?.items ?? []), ...(extra?.items ?? [])];
  const nextBefore = extra ? extra.nextBefore : (first.data?.nextBefore ?? null);

  const loadMore = async () => {
    if (!nextBefore) return;
    setLoading(true);
    setError(null);
    try {
      const page = await apiRequest<Page>(`/api/admin/activity?before=${nextBefore}${actor ? `&actor=${actor}` : ""}`);
      setMore({ key: actor, items: [...(extra?.items ?? []), ...page.items], nextBefore: page.nextBefore });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Activity" description="Sign-ups, sign-ins, orders, partner updates, reviews and admin changes across all three websites." />
      <div role="tablist" aria-label="Filter by who acted" className="mb-4 flex gap-1.5 overflow-x-auto rounded-2xl bg-ink-100 p-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id || "all"}
            type="button"
            role="tab"
            aria-selected={actor === f.id}
            onClick={() => setActor(f.id)}
            className={cn("min-h-10 whitespace-nowrap rounded-xl px-4 text-sm font-semibold", actor === f.id ? "bg-white shadow-card" : "text-ink-600 hover:text-ink-900")}
          >
            {f.label}
          </button>
        ))}
      </div>
      <Panel title={`${items.length} events${nextBefore ? "+" : ""}`} action={<Button size="sm" variant="ghost" onClick={first.reload}>Refresh</Button>}>
        {first.status === "error" ? (
          <ErrorState inline title="Couldn't load activity" message={first.error ?? ""} onRetry={first.reload} />
        ) : !first.data ? (
          <Skeleton className="h-48" />
        ) : (
          <>
            <ActivityList items={items} />
            {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
            {nextBefore && (
              <Button variant="outline" size="sm" className="mt-3" loading={loading} loadingText="Loading…" onClick={() => void loadMore()}>
                Load older
              </Button>
            )}
          </>
        )}
      </Panel>
    </>
  );
}
