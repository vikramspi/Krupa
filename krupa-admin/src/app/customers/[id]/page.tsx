import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/admin/CustomerDetail";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Customer" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return (
    <AdminShell>
      <CustomerDetail id={id} />
    </AdminShell>
  );
}
