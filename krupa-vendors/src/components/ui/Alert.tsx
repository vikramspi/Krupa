import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type AlertTone = "info" | "success" | "warning";

const toneStyles: Record<AlertTone, { box: string; icon: ReactNode }> = {
  info: { box: "border-sky-200 bg-sky-50 text-sky-900", icon: <Info className="size-5 text-sky-600" aria-hidden="true" /> },
  success: {
    box: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />,
  },
  warning: {
    box: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <TriangleAlert className="size-5 text-amber-600" aria-hidden="true" />,
  },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Use "status" for messages that appear in response to user actions. */
  role?: "status" | "alert" | "note";
}

export function Alert({ tone = "info", title, children, action, className, role = "note" }: AlertProps) {
  const styles = toneStyles[tone];
  return (
    <div role={role} className={cn("flex items-start gap-3 rounded-2xl border p-4", styles.box, className)}>
      <span className="mt-0.5 shrink-0">{styles.icon}</span>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
