import type { Metadata } from "next";
import { ActivityLog } from "@/components/admin/ActivityLog";
import { AdminShell } from "@/components/layout/AdminShell";

export const metadata: Metadata = { title: "Activity" };

export default function Page() {
  return (
    <AdminShell>
      <ActivityLog />
    </AdminShell>
  );
}
