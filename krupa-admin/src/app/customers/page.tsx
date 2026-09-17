import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Customers" };

export default function Page() {
  return (
    <AdminShell>
      <Suspense>
        <CustomersTable />
      </Suspense>
    </AdminShell>
  );
}
