import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transactional email for the partner portal (SMTP, e.g. Gmail app password).
 * Without SMTP settings nothing is sent and callers decide whether that matters.
 */
export interface SendResult {
  sent: boolean;
  skipped?: "not_configured" | "no_recipient";
  error?: string;
}

const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD?.trim());

let transporter: Transporter | null = null;
function smtp(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASSWORD!.trim() },
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return smtpConfigured();
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  if (!smtpConfigured()) return { sent: false, skipped: "not_configured" };
  try {
    const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER!.trim();
    await smtp().sendMail({ from, to, subject, html });
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Unknown email error" };
  }
}

const wrap = (body: string) =>
  `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#141b27;max-width:560px">${body}</div>`;
const button = (href: string, label: string) =>
  `<p style="margin:0 0 24px"><a href="${escapeHtml(href)}" style="display:inline-block;background:#117064;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">${escapeHtml(label)}</a></p>`;
const muted = (text: string) => `<p style="margin:0 0 8px;color:#566377;font-size:14px">${text}</p>`;

const partnerPortal = () => (process.env.VENDOR_PORTAL_URL?.trim() || "http://localhost:3001").replace(/\/$/, "");

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Invites a partner to set a password for the partner portal. */
export function sendPartnerInvite(to: string, name: string, vendorName: string, token: string) {
  const link = `${partnerPortal()}/set-password?kind=invite&token=${token}`;
  return sendEmail(
    to,
    `Your Krupa Laundry partner login for ${vendorName}`,
    wrap(
      `<h2 style="margin:0 0 12px">Welcome to the Krupa Laundry partner portal</h2>
       <p style="margin:0 0 16px">Hi ${escapeHtml(name.split(" ")[0])}, you've been added as a partner login for <strong>${escapeHtml(vendorName)}</strong>. You'll see new pickup requests there, accept them, and update each order until it's delivered.</p>
       ${button(link, "Set your password")}
       ${muted("This link expires in 7 days and can be used once. After that, log in at " + escapeHtml(partnerPortal()) + ".")}
       ${muted("If you weren't expecting this, you can ignore this email.")}`,
    ),
  );
}
