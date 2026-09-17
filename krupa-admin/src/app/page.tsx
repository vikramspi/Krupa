import { AdminShell } from "@/components/layout/AdminShell";
import { Dashboard } from "@/components/admin/Dashboard";

export default function Page() {
  return (
    <AdminShell>
      <Dashboard />
    </AdminShell>
  );
}
