import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminOrderDetail } from "@/components/admin/AdminOrderDetail";
import { AdminShell } from "@/components/layout/AdminShell";

interface Props {
  params: Promise<{ code: string }>;
}

async function code(params: Props["params"]) {
  const value = decodeURIComponent((await params).code).toUpperCase();
  if (!/^KR-\d{5,8}$/.test(value)) notFound();
  return value;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: await code(params) };
}

export default async function Page({ params }: Props) {
  const value = await code(params);
  return (
    <AdminShell>
      <AdminOrderDetail code={value} />
    </AdminShell>
  );
}
