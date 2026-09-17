import type { Metadata } from "next";
import { VendorForm } from "@/components/admin/VendorForm";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Add vendor" };

export default function Page() {
  return (
    <AdminShell>
      <VendorForm />
    </AdminShell>
  );
}
