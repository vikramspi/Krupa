import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const palettes = [
  "bg-brand-600 text-white",
  "bg-ink-900 text-white",
  "bg-sun-100 text-sun-700",
  "bg-sky-100 text-sky-800",
  "bg-brand-100 text-brand-800",
  "bg-rose-100 text-rose-800",
];

function paletteFor(id: string) {
  let sum = 0;
  for (const char of id) sum += char.charCodeAt(0);
  return palettes[sum % palettes.length];
}

export function VendorAvatar({ id, name, size = "md", className }: { id: string; name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center font-extrabold tracking-tight",
        size === "sm" && "size-10 rounded-xl text-sm",
        size === "md" && "size-12 rounded-2xl text-base",
        size === "lg" && "size-16 rounded-[20px] text-xl",
        paletteFor(id),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
