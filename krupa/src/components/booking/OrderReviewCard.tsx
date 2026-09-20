import { CalendarClock, Clock, MapPin, NotebookPen, Phone, Store, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { RatingPill } from "@/components/ui/RatingStars";
import { formatINR, formatPhone, formatRelativeDay, formatShortDate } from "@/lib/format";
import { formatDeliveryWindow } from "@/lib/schedule";
import type { BookingSummary } from "@/hooks/useBookingSummary";
import type { CustomerDetailsDraft } from "@/state/bookingStore";
import { VendorAvatar } from "./VendorAvatar";

interface OrderReviewCardProps {
  summary: BookingSummary;
  details: CustomerDetailsDraft;
  deliveryWindow: { from: Date; to: Date } | null;
}

export function OrderReviewCard({ summary, details, deliveryWindow }: OrderReviewCardProps) {
  const { vendor, cart, pickup, location, turnaround } = summary;
  if (!vendor || !pickup || !location) return null;

  const pickupDay = formatRelativeDay(pickup.date);
  const pickupDayLabel = pickupDay === "Today" || pickupDay === "Tomorrow" ? `${pickupDay}, ${formatShortDate(pickup.date)}` : pickupDay;

  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-white shadow-card">
      <ReviewSection title="Pickup" editHref="/book/schedule" editLabel="pickup time" icon={<CalendarClock />}>
        <p className="font-semibold text-ink-900">{pickupDayLabel}</p>
        <p className="text-ink-600">{pickup.slotLabel}</p>
        {deliveryWindow && turnaround && (
          <p className="mt-2 inline-flex items-start gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Expected delivery: {turnaround.min}–{turnaround.max} hours after pickup
              <span className="block font-semibold">{formatDeliveryWindow(deliveryWindow.from, deliveryWindow.to)}</span>
            </span>
          </p>
        )}
      </ReviewSection>

      <ReviewSection title="Pickup address" editHref="/book/details" editLabel="address" icon={<MapPin />}>
        <address className="not-italic text-ink-700">
          <span className="block font-semibold text-ink-900">{details.line1}</span>
          {details.line2}
          {details.landmark && `, ${details.landmark}`}
          <span className="block">
            {location.areaName}, {location.city} {location.pincode}
          </span>
        </address>
        {details.instructions && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-500">
            <NotebookPen className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            &ldquo;{details.instructions}&rdquo;
          </p>
        )}
      </ReviewSection>

      <ReviewSection title="Contact" editHref="/book/details" editLabel="contact details" icon={<UserRound />}>
        <p className="font-semibold text-ink-900">{details.name}</p>
        <p className="flex items-center gap-1.5 text-ink-600">
          <Phone className="size-3.5" aria-hidden="true" />
          {formatPhone(details.phone)}
        </p>
        {details.email && <p className="text-ink-600">{details.email}</p>}
      </ReviewSection>

      <ReviewSection title="Laundry partner" editHref="/book/vendors" editLabel="laundry partner" icon={<Store />}>
        <div className="flex items-center gap-3">
          <VendorAvatar id={vendor.id} name={vendor.name} size="sm" />
          <div>
            <p className="font-semibold text-ink-900">{vendor.name}</p>
            <RatingPill rating={vendor.rating} className="text-sm" />
          </div>
        </div>
      </ReviewSection>

      <section aria-labelledby="review-items" className="p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 id="review-items" className="font-semibold text-ink-900">
            Items
          </h2>
          <Link href="/book/services" className="rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            Edit<span className="sr-only"> items</span>
          </Link>
        </div>
        <table className="mt-3 w-full text-[15px]">
          <caption className="sr-only">Items in this order</caption>
          <thead>
            <tr className="text-left font-mono text-[12px] text-ink-500">
              <th scope="col" className="pb-2 font-semibold">Item</th>
              <th scope="col" className="pb-2 text-right font-semibold">Qty × price</th>
              <th scope="col" className="pb-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cart.map((line) => (
              <tr key={line.itemId}>
                <th scope="row" className="py-2.5 pr-3 text-left font-medium text-ink-800">
                  {line.name}
                </th>
                <td className="whitespace-nowrap py-2.5 text-right text-ink-500">
                  {line.quantity} × {formatINR(line.unitPrice)}
                </td>
                <td className="whitespace-nowrap py-2.5 pl-3 text-right font-semibold tabular-nums text-ink-900">
                  {formatINR(line.quantity * line.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function ReviewSection({
  title,
  editHref,
  editLabel,
  icon,
  children,
}: {
  title: string;
  editHref: string;
  editLabel: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const id = `review-${title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex gap-4 p-5 sm:p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600 [&_svg]:size-5" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-[15px]">
        <div className="flex items-start justify-between gap-2">
          <h2 id={id} className="font-mono text-[13px] text-ink-500">
            {title}
          </h2>
          <Link href={editHref} className="-mt-1 rounded-lg px-2 py-1 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            Edit<span className="sr-only"> {editLabel}</span>
          </Link>
        </div>
        <div className="mt-1">{children}</div>
      </div>
    </section>
  );
}
