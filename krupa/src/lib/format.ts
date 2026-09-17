const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inr.format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

/**
 * All dates are Mumbai dates. The site serves one city, but servers (e.g. Vercel)
 * run in UTC — so "today", slot cut-offs and every displayed date are computed in
 * Asia/Kolkata explicitly. India has no daylight saving, so the offset is fixed.
 */
export const TIME_ZONE = "Asia/Kolkata";
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });

/** Mumbai calendar key, yyyy-mm-dd. */
export function toDateKey(date: Date): string {
  return dateKeyFormat.format(date);
}

/** Midnight (Mumbai) at the start of the given yyyy-mm-dd. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

/** The instant at `hour` o'clock Mumbai time on the given yyyy-mm-dd. */
export function atMumbaiHour(key: string, hour: number): Date {
  return new Date(fromDateKey(key).getTime() + hour * 3_600_000);
}

/** Hours since Mumbai midnight, e.g. 14.5 for 2:30 PM. */
export function mumbaiHour(date: Date): number {
  return (((date.getTime() + IST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS / 3_600_000;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

/** "Fri, 11 Sep" */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? parseDate(date) : date;
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TIME_ZONE });
}

/** "11 Sep 2026" */
export function formatLongDate(date: Date | string): string {
  const d = typeof date === "string" ? parseDate(date) : date;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: TIME_ZONE });
}

/** "Aug 2026" */
export function formatMonthYear(date: string): string {
  return parseDate(date).toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: TIME_ZONE });
}

/** "Friday" */
export function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-IN", { weekday: "long", timeZone: TIME_ZONE });
}

/** "11 Sep" */
export function formatDayMonth(date: Date): string {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TIME_ZONE });
}

/** "2:30 PM" */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: TIME_ZONE }).toUpperCase();
}

/** "Today", "Tomorrow", "Yesterday" or "Fri, 11 Sep" relative to now. */
export function formatRelativeDay(date: Date | string, now: Date = new Date()): string {
  const d = typeof date === "string" ? parseDate(date) : date;
  if (isSameDay(d, now)) return "Today";
  if (isSameDay(d, addDays(now, 1))) return "Tomorrow";
  if (isSameDay(d, addDays(now, -1))) return "Yesterday";
  return formatShortDate(d);
}

/** "Today, 2:30 PM" */
export function formatDateTime(iso: string, now: Date = new Date()): string {
  return `${formatRelativeDay(new Date(iso), now)}, ${formatTime(iso)}`;
}

/** Accepts either a date key (Mumbai) or a full ISO timestamp. */
function parseDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromDateKey(value) : new Date(value);
}

/** "+91 98200 12345" */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) return phone;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatHourRange({ min, max }: { min: number; max: number }): string {
  return `${min}–${max} hours`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
