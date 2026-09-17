import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { statusMeta, type StatusTone } from "@/lib/orderStatus";
import type { OrderStatus } from "@/types";

const toneMap: Record<StatusTone, BadgeTone> = {
  neutral: "neutral",
  info: "info",
  progress: "warning",
  brand: "brand",
  success: "success",
};

export function OrderStatusBadge({ status, size = "sm", className }: { status: OrderStatus; size?: "sm" | "md"; className?: string }) {
  const meta = statusMeta(status);
  return (
    <Badge tone={toneMap[meta.tone]} size={size} className={className}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      <span className="sr-only">Status: </span>
      {meta.label}
    </Badge>
  );
}
