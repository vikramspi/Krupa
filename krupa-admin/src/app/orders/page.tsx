import type { Metadata } from "next";
import { Suspense } from "react";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Orders" };

export default function Page() {
  return (
    <AdminShell>
      <Suspense>
        <OrdersTable />
      </Suspense>
    </AdminShell>
  );
}
