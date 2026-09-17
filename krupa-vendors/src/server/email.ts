import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { formatINR, formatPhone, formatShortDate } from "@/lib/format";
import type { VendorOrder } from "@/types";

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

export function sendPartnerPasswordReset(to: string, name: string, link: string) {
  return sendEmail(
    to,
    "Reset your partner portal password — Krupa Laundry",
    wrap(
      `<h2 style="margin:0 0 12px">Reset your password</h2>
       <p style="margin:0 0 16px">Hi ${escapeHtml(name.split(" ")[0])}, use the button below to choose a new password for the Krupa Laundry partner portal.</p>
       ${button(link, "Choose a new password")}
       ${muted("This link expires in 1 hour and can be used once.")}
       ${muted("If you didn't ask for this, no action is needed.")}`,
    ),
  );
}

const customerSite = () => (process.env.CUSTOMER_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");

/** Tells the customer their order was declined, if they gave an email. */
export function sendCustomerCancelled(to: string | null, order: VendorOrder, vendorName: string, reason: string) {
  if (!to) return Promise.resolve<SendResult>({ sent: false, skipped: "no_recipient" });
  return sendEmail(
    to,
    `Your Krupa Laundry order ${order.code} was cancelled`,
    wrap(
      `<h2 style="margin:0 0 12px">Sorry — your order was cancelled</h2>
       <p style="margin:0 0 16px">Hi ${escapeHtml(order.customer.name.split(" ")[0] || "there")}, ${escapeHtml(vendorName)} couldn't take order <strong>${escapeHtml(order.code)}</strong> (pickup ${escapeHtml(formatShortDate(order.pickup.date))}, ${escapeHtml(order.pickup.slotLabel)}).</p>
       <p style="margin:0 0 16px">Reason: ${escapeHtml(reason)}</p>
       <p style="margin:0 0 16px">Nothing will be collected and you won't be charged. You can book again with another partner:</p>
       ${button(`${customerSite()}/book`, "Book another pickup")}`,
    ),
  );
}

/** Thanks the customer after delivery and asks for a review. */
export function sendCustomerDelivered(to: string | null, order: VendorOrder, vendorName: string) {
  if (!to) return Promise.resolve<SendResult>({ sent: false, skipped: "no_recipient" });
  return sendEmail(
    to,
    `Delivered: your Krupa Laundry order ${order.code}`,
    wrap(
      `<h2 style="margin:0 0 12px">Your laundry has been delivered</h2>
       <p style="margin:0 0 16px">Hi ${escapeHtml(order.customer.name.split(" ")[0] || "there")}, ${escapeHtml(vendorName)} has delivered order <strong>${escapeHtml(order.code)}</strong>. Please pay ${escapeHtml(formatINR(order.pricing.total))} by cash or UPI if you haven't already.</p>
       <p style="margin:0 0 16px">How did it go? Your rating helps other customers choose.</p>
       ${button(`${customerSite()}/account/orders/${encodeURIComponent(order.code)}#review-${encodeURIComponent(order.code)}`, `Rate ${vendorName}`)}`,
    ),
  );
}

/** Operator alert when a partner declines an order. */
export function sendOperatorDeclined(order: VendorOrder, vendorName: string, reason: string) {
  const to = process.env.ORDER_NOTIFICATION_EMAIL?.trim();
  if (!to) return Promise.resolve<SendResult>({ sent: false, skipped: "no_recipient" });
  return sendEmail(
    to,
    `Declined: ${order.code} by ${vendorName}`,
    wrap(
      `<h2 style="margin:0 0 12px">${escapeHtml(vendorName)} declined ${escapeHtml(order.code)}</h2>
       <p style="margin:0 0 8px">Reason: <strong>${escapeHtml(reason)}</strong></p>
       <p style="margin:0 0 8px">Customer: ${escapeHtml(order.customer.name)} · ${escapeHtml(formatPhone(order.customer.phone))}</p>
       <p style="margin:0 0 16px">Pickup: ${escapeHtml(formatShortDate(order.pickup.date))}, ${escapeHtml(order.pickup.slotLabel)} · ${escapeHtml(order.address.areaName)}</p>
       ${muted("The order is now cancelled. Consider calling the customer to rebook with another partner.")}`,
    ),
  );
}
