import type { Metadata } from "next";
import { VendorsList } from "@/components/admin/VendorsList";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Vendors" };

export default function Page() {
  return (
    <AdminShell>
      <VendorsList />
    </AdminShell>
  );
}
