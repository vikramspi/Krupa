import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { OrderDetail } from "@/components/orders/OrderDetail";

interface Props {
  params: Promise<{ code: string }>;
}

const codeFrom = async (params: Props["params"]) => {
  const code = decodeURIComponent((await params).code).toUpperCase();
  if (!/^KR-\d{5,8}$/.test(code)) notFound();
  return code;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${await codeFrom(params)}` };
}

export default async function OrderPage({ params }: Props) {
  const code = await codeFrom(params);
  return (
    <PortalShell>
      <OrderDetail code={code} />
    </PortalShell>
  );
}
