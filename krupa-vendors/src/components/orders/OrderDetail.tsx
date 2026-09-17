"use client";

import { ArrowLeft, CalendarClock, Check, MapPin, MessageSquareText, Navigation, Phone, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Sheet } from "@/components/ui/Sheet";
import { useAsync } from "@/hooks/useAsync";
import { apiRequest } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { getErrorMessage, isServiceError } from "@/lib/errors";
import { formatDateTime, formatINR, formatPhone, formatRelativeDay, formatShortDate } from "@/lib/format";
import { ADVANCE_LABEL, PARTNER_STATUS } from "@/lib/partnerStatus";
import type { OrderStatus, VendorOrder } from "@/types";
import { StatusBadge } from "./StatusBadge";

type Action = "accept" | "decline" | "advance";
interface OrderResponse {
  order: VendorOrder;
  actions: Action[];
  nextStatus: OrderStatus | null;
}

const DECLINE_REASONS = [
  "Fully booked for this pickup time",
  "Can't reach this area on that day",
  "We don't handle one or more of these items",
  "Shop closed on that day",
];

export function OrderDetail({ code }: { code: string }) {
  const loaded = useAsync(() => apiRequest<OrderResponse>(`/api/orders/${code}`), `order:${code}`);
  const [override, setOverride] = useState<OrderResponse | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState<{ message: string; stale: boolean } | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [confirmDelivered, setConfirmDelivered] = useState(false);

  if (loaded.status === "error") {
    const missing = /isn't one of yours|doesn't exist/.test(loaded.error ?? "");
    return (
      <Container size="narrow" className="py-16">
        {missing ? (
          <EmptyState title="Order not found" description={`${code} isn't one of your orders.`} actions={<ButtonLink href="/orders">Back to orders</ButtonLink>} />
        ) : (
          <ErrorState title="Couldn't load this order" message={loaded.error ?? ""} onRetry={loaded.reload} />
        )}
      </Container>
    );
  }
  if (!loaded.data) return <LoadingState title="Loading order…" className="py-24" />;

  const data = override && override.order.code === code ? override : loaded.data;
  const { order, actions, nextStatus } = data;

  const act = async (action: Action, reason?: string) => {
    setPending(action);
    setError(null);
    try {
      const res = await apiRequest<OrderResponse>(`/api/orders/${code}/status`, {
        method: "POST",
        body: JSON.stringify({ action, from: order.status, reason }),
      });
      setOverride(res);
      setDeclineOpen(false);
      setConfirmDelivered(false);
    } catch (err) {
      setError({ message: getErrorMessage(err), stale: isServiceError(err) && err.apiCode === "conflict" });
    } finally {
      setPending(null);
    }
  };

  const refresh = () => {
    setOverride(null);
    setError(null);
    loaded.reload();
  };

  const day = formatRelativeDay(order.pickup.date);
  const address = [order.address.line1, order.address.line2, order.address.landmark, `${order.address.areaName}, ${order.address.city} ${order.address.pincode}`]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <Container size="narrow" className="pt-6">
      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" />
        All orders
      </Link>

      <header className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-mono text-3xl font-bold">{order.code}</h1>
          <p className="mt-1 text-sm text-ink-500">Booked {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} size="md" />
      </header>

      {/* What the partner should do now */}
      <section aria-label="Next step" className="mt-6 space-y-3">
        {error && (
          <Alert tone="warning" title="Couldn't update the order" role="alert">
            {error.message}
            {error.stale && (
              <Button variant="outline" size="sm" className="mt-2" onClick={refresh} leadingIcon={<RefreshCw className="size-4" aria-hidden="true" />}>
                Refresh order
              </Button>
            )}
          </Alert>
        )}

        {actions.includes("accept") && (
          <Card className="border-sun-300">
            <h2 className="font-bold">New order — can you take it?</h2>
            <p className="mt-1 text-[15px] text-ink-600">
              Pickup {day === "Today" || day === "Tomorrow" ? day.toLowerCase() : `on ${formatShortDate(order.pickup.date)}`}, {order.pickup.slotLabel} in {order.address.areaName}. The customer is waiting for your confirmation.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button size="lg" loading={pending === "accept"} loadingText="Accepting…" disabled={pending !== null} onClick={() => void act("accept")} leadingIcon={<Check className="size-5" aria-hidden="true" />}>
                Accept order
              </Button>
              <Button size="lg" variant="outline" disabled={pending !== null} onClick={() => setDeclineOpen(true)} leadingIcon={<X className="size-5" aria-hidden="true" />}>
                Decline
              </Button>
            </div>
          </Card>
        )}

        {actions.includes("advance") && nextStatus && (
          <Card>
            <p className="text-sm text-ink-500">
              Current step: <strong className="text-ink-800">{PARTNER_STATUS[order.status].label}</strong>
            </p>
            {nextStatus === "delivered" && confirmDelivered ? (
              <div className="mt-3">
                <p className="text-[15px] font-semibold">
                  Confirm the customer has received their clothes and you&apos;ve collected {formatINR(order.pricing.total)}?
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button size="lg" loading={pending === "advance"} loadingText="Saving…" onClick={() => void act("advance")}>
                    Yes, mark delivered
                  </Button>
                  <Button size="lg" variant="ghost" disabled={pending !== null} onClick={() => setConfirmDelivered(false)}>
                    Not yet
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                size="lg"
                fullWidth
                className="mt-3"
                loading={pending === "advance"}
                loadingText="Saving…"
                onClick={() => (nextStatus === "delivered" ? setConfirmDelivered(true) : void act("advance"))}
              >
                {ADVANCE_LABEL[nextStatus] ?? "Next step"}
              </Button>
            )}
          </Card>
        )}

        {order.status === "delivered" && (
          <Alert tone="success" title="Delivered">
            This order is complete. The customer can now rate your service.
          </Alert>
        )}
        {order.status === "cancelled" && (
          <Alert tone="info" title="Cancelled">
            {order.history.findLast((e) => e.status === "cancelled")?.note ?? "This order was cancelled."}
          </Alert>
        )}
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card as="section" aria-labelledby="pickup-title">
          <h2 id="pickup-title" className="font-bold">
            Pickup
          </h2>
          <p className="mt-3 flex items-start gap-2 text-[15px]">
            <CalendarClock className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span>
              <strong>{day === "Today" || day === "Tomorrow" ? day : formatShortDate(order.pickup.date)}</strong>, {order.pickup.slotLabel}
            </span>
          </p>
          <p className="mt-2 flex items-start gap-2 text-[15px]">
            <MapPin className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
            <span className="break-words">{address}</span>
          </p>
          {order.instructions && (
            <p className="mt-2 flex items-start gap-2 text-[15px]">
              <MessageSquareText className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span className="break-words">&ldquo;{order.instructions}&rdquo;</span>
            </p>
          )}
          <ButtonLink href={mapsUrl} target="_blank" rel="noopener noreferrer" variant="outline" size="sm" className="mt-4" leadingIcon={<Navigation className="size-4" aria-hidden="true" />}>
            Open in Maps
          </ButtonLink>
        </Card>

        <Card as="section" aria-labelledby="customer-title">
          <h2 id="customer-title" className="font-bold">
            Customer
          </h2>
          <p className="mt-3 text-[15px] font-semibold">{order.customer.name}</p>
          {order.customer.phone && (
            <>
              <p className="text-[15px] text-ink-600">{formatPhone(order.customer.phone)}</p>
              <ButtonLink href={`tel:+91${order.customer.phone}`} size="sm" className="mt-4" leadingIcon={<Phone className="size-4" aria-hidden="true" />}>
                Call customer
              </ButtonLink>
            </>
          )}
          <p className="mt-4 text-sm text-ink-500">Call before pickup and before delivery. Payment: cash or UPI after delivery.</p>
        </Card>
      </div>

      <Card as="section" aria-labelledby="items-title" className="mt-4">
        <h2 id="items-title" className="font-bold">
          Items
        </h2>
        <table className="mt-3 w-full text-[15px]">
          <caption className="sr-only">Items in {order.code}</caption>
          <thead className="text-left text-xs uppercase tracking-wider text-ink-400">
            <tr>
              <th scope="col" className="pb-2 font-semibold">Item</th>
              <th scope="col" className="pb-2 text-right font-semibold">Qty</th>
              <th scope="col" className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.items.map((line) => (
              <tr key={line.itemId}>
                <td className="py-2 pr-3">
                  {line.name}
                  <span className="block text-xs text-ink-400">{formatINR(line.unitPrice)} each</span>
                </td>
                <td className="py-2 text-right font-semibold tabular-nums">{line.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatINR(line.unitPrice * line.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[15px]">
          <Row label={`Subtotal (${order.pricing.itemCount} items)`} value={formatINR(order.pricing.subtotal)} />
          <Row label="Pickup & delivery" value={order.pricing.pickupFee ? formatINR(order.pricing.pickupFee) : "Free"} />
          {order.pricing.discount > 0 && <Row label="Discount" value={`− ${formatINR(order.pricing.discount)}`} />}
          <Row label="Collect from customer" value={formatINR(order.pricing.total)} strong />
        </dl>
        <p className="mt-2 text-xs text-ink-400">Count the items at pickup. If the count differs, call Krupa Laundry before processing.</p>
      </Card>

      <Card as="section" aria-labelledby="history-title" className="mt-4">
        <h2 id="history-title" className="font-bold">
          History
        </h2>
        <ol className="mt-3 space-y-3">
          {order.history.map((event, index) => (
            <li key={`${event.status}-${index}`} className="flex items-start justify-between gap-3 text-[15px]">
              <span>
                <span className={cn("font-semibold", event.status === "cancelled" && "text-ink-500")}>{PARTNER_STATUS[event.status].label}</span>
                {event.note && <span className="block text-sm text-ink-500">{event.note}</span>}
              </span>
              <time dateTime={event.at} className="shrink-0 text-sm tabular-nums text-ink-500">
                {formatDateTime(event.at)}
              </time>
            </li>
          ))}
        </ol>
      </Card>

      <DeclineSheet
        open={declineOpen}
        code={order.code}
        pending={pending === "decline"}
        onClose={() => setDeclineOpen(false)}
        onDecline={(reason) => void act("decline", reason)}
      />
    </Container>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", strong && "pt-1 text-base font-bold")}>
      <dt className={strong ? "text-ink-900" : "text-ink-600"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function DeclineSheet({
  open,
  code,
  pending,
  onClose,
  onDecline,
}: {
  open: boolean;
  code: string;
  pending: boolean;
  onClose: () => void;
  onDecline: (reason: string) => void;
}) {
  const [choice, setChoice] = useState<string>("");
  const [other, setOther] = useState("");
  const [error, setError] = useState<string>();
  const reason = choice === "other" ? other.trim() : choice;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Decline ${code}?`}
      description="The customer is told the order was cancelled, with your reason."
      footer={
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="dark"
            size="lg"
            loading={pending}
            loadingText="Declining…"
            onClick={() => {
              if (reason.length < 3) {
                setError("Choose or write a reason.");
                return;
              }
              setError(undefined);
              onDecline(reason);
            }}
          >
            Decline order
          </Button>
          <Button variant="ghost" size="lg" disabled={pending} onClick={onClose}>
            Keep it
          </Button>
        </div>
      }
    >
      <fieldset className="px-5 py-5 sm:px-6" aria-describedby={error ? "decline-error" : undefined}>
        <legend className="text-sm font-semibold text-ink-800">Reason</legend>
        <div className="mt-3 space-y-2">
          {[...DECLINE_REASONS, "other"].map((value) => (
            <label key={value} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
              <input type="radio" name="decline-reason" value={value} checked={choice === value} onChange={() => setChoice(value)} className="size-4 accent-brand-600" />
              <span className="text-[15px]">{value === "other" ? "Other reason" : value}</span>
            </label>
          ))}
        </div>
        {choice === "other" && (
          <div className="mt-3">
            <label htmlFor="decline-other" className="sr-only">
              Other reason
            </label>
            <textarea
              id="decline-other"
              rows={3}
              maxLength={200}
              value={other}
              onChange={(e) => setOther(e.target.value)}
              placeholder="Tell the customer why"
              className="block w-full rounded-2xl border border-line px-4 py-3 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
          </div>
        )}
        {error && (
          <p id="decline-error" className="mt-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}
      </fieldset>
    </Sheet>
  );
}
