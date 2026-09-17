type ClassValue = string | false | null | undefined;

/** Joins conditional class names. Keep overrides non-conflicting — there is no Tailwind merge step. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
