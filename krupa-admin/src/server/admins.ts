import "server-only";

/**
 * Who may use the admin panel: the Google accounts listed in ADMIN_EMAILS
 * (comma-separated). Checked on sign-in AND on every request, so removing an
 * address locks that person out immediately.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails().includes(email!.toLowerCase());
}
