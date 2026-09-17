import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VendorDetail } from "@/components/admin/VendorDetail";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Vendor" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return (
    <AdminShell>
      <Suspense>
        <VendorDetail id={id} />
      </Suspense>
    </AdminShell>
  );
}
