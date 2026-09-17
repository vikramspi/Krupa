"use client";

import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { RatingStars } from "@/components/ui/RatingStars";
import { useAsync } from "@/hooks/useAsync";
import { ADMIN_STATUS, ALL_STATUSES } from "@/lib/adminStatus";
import { apiRequest } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatINR, formatPhone, formatShortDate } from "@/lib/format";
import type { ActivityItem, AdminOrder, OrderStatus } from "@/types";
import { ActivityList, PageHeader, Panel, StatusBadge } from "./common";

export function AdminOrderDetail({ code }: { code: string }) {
  const data = useAsync(() => apiRequest<{ order: AdminOrder; activity: ActivityItem[] }>(`/api/admin/orders/${code}`), `admin-order:${code}`);

  if (data.status === "error") return <ErrorState title={`Couldn't load ${code}`} message={data.error ?? ""} onRetry={data.reload} />;
  if (!data.data) return <LoadingState className="py-24" />;
  const { order, activity } = data.data;

  const address = [order.address.line1, order.address.line2, order.address.landmark, `${order.address.areaName}, ${order.address.city} ${order.address.pincode}`].filter(Boolean).join(", ");

  return (
    <>
      <Link href="/orders" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Orders
      </Link>
      <PageHeader title={order.code} description={<>Booked {formatDateTime(order.createdAt)} · last change {formatDateTime(order.updatedAt)}</>} actions={<StatusBadge status={order.status} />} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Customer">
              <p className="font-semibold">
                {order.customerId ? (
                  <Link href={`/customers/${order.customerId}`} className="hover:underline">
                    {order.customer.name}
                  </Link>
                ) : (
                  order.customer.name
                )}
              </p>
              {order.customer.phone && (
                <a href={`tel:+91${order.customer.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-[15px] text-brand-700 hover:underline">
                  <Phone className="size-4" aria-hidden="true" /> {formatPhone(order.customer.phone)}
                </a>
              )}
              {order.contactEmail && <p className="text-[15px] text-ink-600">{order.contactEmail}</p>}
              <p className="mt-3 text-[15px] text-ink-700">{address}</p>
              {order.instructions && <p className="mt-2 text-[15px] italic text-ink-600">&ldquo;{order.instructions}&rdquo;</p>}
            </Panel>
            <Panel title="Vendor & pickup">
              <Link href={`/vendors/${order.vendor.id}`} className="font-semibold hover:underline">
                {order.vendor.name}
              </Link>
              {order.vendor.phone && (
                <a href={`tel:+91${order.vendor.phone}`} className="mt-1 flex items-center gap-1.5 text-[15px] text-brand-700 hover:underline">
                  <Phone className="size-4" aria-hidden="true" /> {formatPhone(order.vendor.phone)}
                </a>
              )}
              <p className="mt-3 text-[15px]">
                Pickup <strong>{formatShortDate(order.pickup.date)}</strong>, {order.pickup.slotLabel}
              </p>
              {order.estimatedDelivery.from && order.estimatedDelivery.to && (
                <p className="text-[15px] text-ink-600">
                  Estimated delivery {formatShortDate(order.estimatedDelivery.from)} – {formatShortDate(order.estimatedDelivery.to)}
                </p>
              )}
            </Panel>
          </div>

          <Panel title={`Items · ${order.pricing.itemCount}`}>
            <table className="w-full text-[15px]">
              <tbody className="divide-y divide-line">
                {order.items.map((line) => (
                  <tr key={line.itemId}>
                    <td className="py-2">{line.name}</td>
                    <td className="py-2 text-right tabular-nums text-ink-500">
                      {line.quantity} × {formatINR(line.unitPrice)}
                    </td>
                    <td className="py-2 text-right tabular-nums">{formatINR(line.quantity * line.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[15px]">
              <div className="flex justify-between"><dt className="text-ink-600">Subtotal</dt><dd>{formatINR(order.pricing.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Pickup fee</dt><dd>{formatINR(order.pricing.pickupFee)}</dd></div>
              {order.pricing.discount > 0 && <div className="flex justify-between"><dt className="text-ink-600">Discount</dt><dd>− {formatINR(order.pricing.discount)}</dd></div>}
              <div className="flex justify-between font-bold"><dt>Total (paid to partner)</dt><dd>{formatINR(order.pricing.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="Customer-visible timeline">
            <ol className="space-y-3">
              {order.history.map((event, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 text-[15px]">
                  <span>
                    <strong>{ADMIN_STATUS[event.status]?.label ?? event.status}</strong>
                    {event.note && <span className="block text-sm text-ink-500">{event.note}</span>}
                  </span>
                  <time className="text-sm text-ink-500" dateTime={event.at}>{formatDateTime(event.at)}</time>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <StatusOverride order={order} onChanged={data.reload} />
          {order.review && (
            <Panel title="Customer review" action={<Link href="/reviews" className="text-sm font-semibold text-brand-700">Moderate</Link>}>
              <RatingStars rating={order.review.rating} size="md" />
              {order.review.comment && <p className="mt-2 whitespace-pre-line text-[15px]">{order.review.comment}</p>}
              {!order.review.isPublished && <p className="mt-2 text-sm font-semibold text-sun-700">Hidden from the public</p>}
            </Panel>
          )}
          <Panel title="Activity">
            <ActivityList items={activity} empty="No logged activity for this order." />
          </Panel>
        </div>
      </div>
    </>
  );
}

function StatusOverride({ order, onChanged }: { order: AdminOrder; onChanged: () => void }) {
  const [to, setTo] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!to) return setError("Choose the new status.");
    if (to === "cancelled" && note.trim().length < 3) return setError("Add a reason — the customer sees it.");
    setError(null);
    setSaving(true);
    try {
      await apiRequest(`/api/admin/orders/${order.code}/status`, {
        method: "POST",
        body: JSON.stringify({ to, from: order.status, note: note.trim() || undefined }),
      });
      setDone(`Status changed to ${ADMIN_STATUS[to].label}.`);
      setTo("");
      setNote("");
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Change status">
      <p className="text-sm text-ink-500">Use this when a partner can&apos;t update the order themselves, or to cancel it. The note appears on the customer&apos;s timeline.</p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label htmlFor="override-status" className="text-sm font-semibold">
          New status
        </label>
        <select
          id="override-status"
          value={to}
          onChange={(e) => setTo(e.target.value as OrderStatus)}
          className="block h-11 w-full rounded-2xl border border-line bg-white px-3 text-[15px]"
        >
          <option value="">Choose…</option>
          {ALL_STATUSES.filter((s) => s !== order.status).map((s) => (
            <option key={s} value={s}>
              {ADMIN_STATUS[s].label}
            </option>
          ))}
        </select>
        <label htmlFor="override-note" className="block text-sm font-semibold">
          Note for the customer {to === "cancelled" ? "(required)" : "(optional)"}
        </label>
        <textarea
          id="override-note"
          rows={2}
          maxLength={200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="block w-full rounded-2xl border border-line px-3 py-2 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
        />
        {error && <Alert tone="warning" title="Not changed" role="alert">{error}</Alert>}
        {done && <Alert tone="success" title="Saved" role="status">{done}</Alert>}
        <Button type="submit" variant="dark" fullWidth loading={saving} loadingText="Saving…">
          Update status
        </Button>
      </form>
    </Panel>
  );
}
