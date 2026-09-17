import { Badge } from "@/components/ui/Badge";
import { PARTNER_STATUS } from "@/lib/partnerStatus";
import type { OrderStatus } from "@/types";

export function StatusBadge({ status, size = "sm" }: { status: OrderStatus; size?: "sm" | "md" }) {
  const meta = PARTNER_STATUS[status];
  return (
    <Badge tone={meta.tone} size={size}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      <span className="sr-only">Status: </span>
      {meta.label}
    </Badge>
  );
}
