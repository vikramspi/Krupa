import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsTable } from "@/components/admin/ReviewsTable";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Reviews" };

export default function Page() {
  return (
    <AdminShell>
      <Suspense>
        <ReviewsTable />
      </Suspense>
    </AdminShell>
  );
}
