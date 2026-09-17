import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackOrderView } from "@/components/tracking/TrackOrderView";
import { isValidOrderId, normalizeOrderId } from "@/lib/validation";

interface TrackOrderPageProps {
  params: Promise<{ orderId: string }>;
}

/** Anything that isn't an order ID shape is a 404, not an order to look up. */
function resolveOrderId(raw: string): string {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    notFound();
  }
  if (!isValidOrderId(decoded)) notFound();
  return normalizeOrderId(decoded);
}

export async function generateMetadata({ params }: TrackOrderPageProps): Promise<Metadata> {
  const { orderId } = await params;
  return { title: `Track ${resolveOrderId(orderId)}`, robots: { index: false } };
}

export default async function TrackOrderPage({ params }: TrackOrderPageProps) {
  const { orderId } = await params;
  return <TrackOrderView orderId={resolveOrderId(orderId)} />;
}
