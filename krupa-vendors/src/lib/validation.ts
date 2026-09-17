/** Keeps the last 10 digits, dropping +91 / 0 prefixes, spaces and dashes. */
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export function isValidIndianMobile(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function isValidPincode(value: string): boolean {
  return /^[1-9]\d{5}$/.test(value.trim());
}

/** Accepts "KR-10284", "KR10284", "kr 10284". Codes grow past 5 digits after KR-99999. */
export function isValidOrderId(value: string): boolean {
  return /^KR[\s-]?\d{5,8}$/i.test(value.trim());
}

/** "kr10284", "KR 10284" → "KR-10284" */
export function normalizeOrderId(value: string): string {
  const digits = value.replace(/\D/g, "");
  return `KR-${digits}`;
}
