import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountOrderDetail } from "@/components/account/AccountOrderDetail";
import { isValidOrderId, normalizeOrderId } from "@/lib/validation";

interface AccountOrderPageProps {
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

export async function generateMetadata({ params }: AccountOrderPageProps): Promise<Metadata> {
  const { orderId } = await params;
  return { title: `Order ${resolveOrderId(orderId)}`, robots: { index: false } };
}

export default async function AccountOrderPage({ params }: AccountOrderPageProps) {
  const { orderId } = await params;
  return <AccountOrderDetail orderId={resolveOrderId(orderId)} />;
}
