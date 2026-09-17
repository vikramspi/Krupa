import type { Metadata } from "next";
import { PortalShell } from "@/components/layout/PortalShell";
import { OrdersBoard } from "@/components/orders/OrdersBoard";

export const metadata: Metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <PortalShell>
      <OrdersBoard />
    </PortalShell>
  );
}
