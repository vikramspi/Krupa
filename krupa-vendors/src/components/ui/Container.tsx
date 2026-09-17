import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const sizeClasses = {
  tight: "max-w-lg",
  narrow: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
};

export function Container({ className, size = "default", ...props }: HTMLAttributes<HTMLDivElement> & { size?: keyof typeof sizeClasses }) {
  return <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizeClasses[size], className)} {...props} />;
}
