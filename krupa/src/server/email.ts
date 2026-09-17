import "server-only";
import type { Order } from "@/types";
import { siteConfig } from "@/lib/config";
import { formatINR, formatPhone, formatShortDate } from "@/lib/format";

/**
 * Transactional email.
 *
 * Two transports behind one seam, chosen by whichever is configured:
 *   SMTP   — any provider (Gmail app password, Mailtrap, a real relay). Sends to
 *            any recipient without owning a domain, so it suits pre-launch testing.
 *   Resend — HTTP API, no dependency, best once a sending domain is verified.
 *
 * With neither configured nothing is sent: the caller decides whether that's fatal
 * (email sign-up refuses) or ignorable (order emails are logged and skipped).
 */
import nodemailer, { type Transporter } from "nodemailer";

const RESEND_BASE = process.env.RESEND_API_BASE?.trim() || "https://api.resend.com";
const RESEND_ENDPOINT = `${RESEND_BASE}/emails`;

interface SendResult {
  sent: boolean;
  skipped?: "not_configured" | "no_recipient";
  error?: string;
}

type Transport = "smtp" | "resend" | null;

const smtpConfigured = () =>
  Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASSWORD?.trim());

function activeTransport(): Transport {
  if (smtpConfigured()) return "smtp";
  if (process.env.RESEND_API_KEY?.trim() && senderAddress()) return "resend";
  return null;
}

/** Sender shown to recipients. Falls back to the SMTP login, which Gmail requires anyway. */
function senderAddress(): string | undefined {
  return process.env.EMAIL_FROM?.trim() || process.env.RESEND_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim();
}

let transporter: Transporter | null = null;
function smtpTransport(): Transporter {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!.trim(),
      port,
      // 465 is implicit TLS; 587 upgrades with STARTTLS.
      secure: port === 465,
      auth: { user: process.env.SMTP_USER!.trim(), pass: process.env.SMTP_PASSWORD!.trim() },
    });
  }
  return transporter;
}

/** Test seam: forces a fresh transporter after env changes. */
export function resetEmailTransport(): void {
  transporter = null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

async function send(payload: { to: string; subject: string; html: string; replyTo?: string }): Promise<SendResult> {
  const transport = activeTransport();
  const from = senderAddress();
  if (!transport || !from) return { sent: false, skipped: "not_configured" };

  try {
    if (transport === "smtp") {
      const info = await smtpTransport().sendMail({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        ...(payload.replyTo ? { replyTo: payload.replyTo } : {}),
      });
      // Ethereal and similar expose a preview URL; real relays return nothing here.
      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.info("[email] preview:", preview);
      return { sent: true };
    }

    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      return { sent: false, error: `Resend responded ${response.status}: ${(await response.text()).slice(0, 200)}` };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Unknown email error" };
  }
}

function itemRows(order: Order): string {
  return order.lines
    .map(
      (line) =>
        `<tr><td style="padding:4px 12px 4px 0">${escapeHtml(line.name)}</td><td style="padding:4px 12px 4px 0">${line.quantity} × ${formatINR(line.unitPrice)}</td><td style="padding:4px 0;text-align:right">${formatINR(line.quantity * line.unitPrice)}</td></tr>`,
    )
    .join("");
}

/** Full order details for the operator — everything needed to dispatch a pickup. */
export function operatorOrderEmail(order: Order): { subject: string; html: string } {
  const address = [order.address.line1, order.address.line2, order.address.landmark, `${order.address.areaName}, ${order.address.city} ${order.address.pincode}`]
    .filter(Boolean)
    .map((part) => escapeHtml(String(part)))
    .join("<br>");

  return {
    subject: `New order ${order.id} — ${order.vendor.name} — ${formatShortDate(order.pickup.date)}, ${order.pickup.slotLabel}`,
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#141b27;max-width:640px">
        <h2 style="margin:0 0 4px">New order ${escapeHtml(order.id)}</h2>
        <p style="margin:0 0 20px;color:#566377">Placed ${escapeHtml(new Date(order.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }))}</p>

        <h3 style="margin:0 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#566377">Customer</h3>
        <p style="margin:0 0 16px">
          <strong>${escapeHtml(order.contact.name)}</strong><br>
          ${escapeHtml(formatPhone(order.contact.phone))}${order.contact.email ? `<br>${escapeHtml(order.contact.email)}` : ""}
        </p>

        <h3 style="margin:0 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#566377">Pickup</h3>
        <p style="margin:0 0 16px">
          <strong>${escapeHtml(formatShortDate(order.pickup.date))} · ${escapeHtml(order.pickup.slotLabel)}</strong><br>
          ${address}
          ${order.instructions ? `<br><em>“${escapeHtml(order.instructions)}”</em>` : ""}
        </p>

        <h3 style="margin:0 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#566377">Laundry partner</h3>
        <p style="margin:0 0 16px">${escapeHtml(order.vendor.name)}${order.vendor.phone ? ` · ${escapeHtml(formatPhone(order.vendor.phone))}` : ""}</p>

        <h3 style="margin:0 0 6px;font-size:14px;text-transform:uppercase;letter-spacing:.08em;color:#566377">Items</h3>
        <table style="border-collapse:collapse;margin:0 0 12px;width:100%">${itemRows(order)}</table>
        <table style="border-collapse:collapse;width:100%;border-top:1px solid #e6e4dc">
          <tr><td style="padding:6px 0">Subtotal</td><td style="padding:6px 0;text-align:right">${formatINR(order.pricing.subtotal)}</td></tr>
          <tr><td style="padding:6px 0">Pickup &amp; delivery</td><td style="padding:6px 0;text-align:right">${formatINR(order.pricing.pickupFee)}</td></tr>
          ${order.pricing.discount > 0 ? `<tr><td style="padding:6px 0">${escapeHtml(order.pricing.discountLabel ?? "Discount")}</td><td style="padding:6px 0;text-align:right">−${formatINR(order.pricing.discount)}</td></tr>` : ""}
          <tr><td style="padding:6px 0;font-weight:700">Total (cash on delivery)</td><td style="padding:6px 0;text-align:right;font-weight:700">${formatINR(order.pricing.total)}</td></tr>
        </table>
      </div>`,
  };
}

export function customerOrderEmail(order: Order): { subject: string; html: string } {
  return {
    subject: `We've received your Krupa Laundry order — ${order.id}`,
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#141b27;max-width:560px">
        <h2 style="margin:0 0 12px">We've received your order</h2>
        <p style="margin:0 0 16px">Hi ${escapeHtml(order.contact.name.split(" ")[0])}, thanks for booking with Krupa Laundry. Your order has been received and sent to your laundry partner.</p>
        <table style="border-collapse:collapse;margin:0 0 16px">
          <tr><td style="padding:4px 16px 4px 0;color:#566377">Order ID</td><td style="padding:4px 0"><strong>${escapeHtml(order.id)}</strong></td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#566377">Pickup</td><td style="padding:4px 0">${escapeHtml(formatShortDate(order.pickup.date))}, ${escapeHtml(order.pickup.slotLabel)}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#566377">Partner</td><td style="padding:4px 0">${escapeHtml(order.vendor.name)}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#566377">Items</td><td style="padding:4px 0">${order.pricing.itemCount}</td></tr>
          <tr><td style="padding:4px 16px 4px 0;color:#566377">Total</td><td style="padding:4px 0"><strong>${formatINR(order.pricing.total)}</strong> — pay by cash or UPI after delivery</td></tr>
        </table>
        <h3 style="margin:0 0 8px;font-size:16px">What happens next</h3>
        <ol style="margin:0 0 16px;padding-left:20px">
          <li style="margin:0 0 6px">${escapeHtml(order.vendor.name)} will confirm your order and call you on ${escapeHtml(formatPhone(order.contact.phone))} before pickup.</li>
          <li style="margin:0 0 6px">Keep your clothes ready in a bag for ${escapeHtml(formatShortDate(order.pickup.date))}, ${escapeHtml(order.pickup.slotLabel)}.</li>
          <li style="margin:0">Pay ${escapeHtml(formatINR(order.pricing.total))} by cash or UPI after your clothes are delivered.</li>
        </ol>
        <p style="margin:0;color:#566377;font-size:14px">Need to change something? Reply to this email or call us on ${escapeHtml(formatPhone(siteConfig.supportPhone))}.</p>
      </div>`,
  };
}

/** True when some transport can actually deliver; email sign-up needs it. */
export function isEmailConfigured(): boolean {
  return activeTransport() !== null;
}

/**
 * Account emails. The links contain single-use signed tokens, so neither the link
 * nor the token is ever logged — only whether delivery succeeded.
 */
export async function sendEmailVerification(to: string, name: string, link: string): Promise<SendResult> {
  return send({
    to,
    subject: "Confirm your email — Krupa Laundry",
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#141b27;max-width:560px">
        <h2 style="margin:0 0 12px">Confirm your email</h2>
        <p style="margin:0 0 16px">${name ? `Hi ${escapeHtml(name.split(" ")[0])}, ` : ""}confirm this address to finish setting up your Krupa Laundry account.</p>
        <p style="margin:0 0 24px">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#117064;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">Confirm email address</a>
        </p>
        <p style="margin:0 0 8px;color:#566377;font-size:14px">This link expires in 24 hours and can be used once.</p>
        <p style="margin:0;color:#566377;font-size:14px">If you didn't create an account, you can ignore this email.</p>
      </div>`,
  });
}

export async function sendPasswordReset(to: string, name: string, link: string): Promise<SendResult> {
  return send({
    to,
    subject: "Reset your password — Krupa Laundry",
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#141b27;max-width:560px">
        <h2 style="margin:0 0 12px">Reset your password</h2>
        <p style="margin:0 0 16px">${name ? `Hi ${escapeHtml(name.split(" ")[0])}, ` : ""}use the button below to choose a new password.</p>
        <p style="margin:0 0 24px">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#117064;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">Choose a new password</a>
        </p>
        <p style="margin:0 0 8px;color:#566377;font-size:14px">This link expires in 1 hour and can be used once. Your current password stays active until you finish.</p>
        <p style="margin:0;color:#566377;font-size:14px">If you didn't ask for this, no action is needed.</p>
      </div>`,
  });
}

/** Forgot-password for an account that has no password (created with Google). */
export async function sendPasswordSetup(to: string, name: string, link: string): Promise<SendResult> {
  const signIn = `${siteConfig.url.replace(/\/$/, "")}/login`;
  return send({
    to,
    subject: "You sign in with Google — Krupa Laundry",
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#141b27;max-width:560px">
        <h2 style="margin:0 0 12px">Your account uses Google sign-in</h2>
        <p style="margin:0 0 16px">${name ? `Hi ${escapeHtml(name.split(" ")[0])}, ` : ""}someone asked to reset the password for this address, but your Krupa Laundry account doesn't have a password — you sign in with Google.</p>
        <p style="margin:0 0 24px">
          <a href="${escapeHtml(signIn)}" style="display:inline-block;background:#117064;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:600">Continue with Google</a>
        </p>
        <p style="margin:0 0 8px;color:#566377;font-size:14px">Prefer an email and password too? <a href="${escapeHtml(link)}" style="color:#117064">Set a password</a> — this link expires in 1 hour and can be used once.</p>
        <p style="margin:0;color:#566377;font-size:14px">If you didn't ask for this, no action is needed.</p>
      </div>`,
  });
}

/** A visitor outside our coverage asked to be told when we launch in their area. */
export async function sendWaitlistEmail(area: string, contact: string): Promise<SendResult> {
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, skipped: "no_recipient" };
  const isEmail = contact.includes("@");
  return send({
    to,
    subject: `Waitlist: ${area}`,
    html: `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#141b27;max-width:560px">
        <h2 style="margin:0 0 12px">New launch-update request</h2>
        <p style="margin:0 0 8px">Area: <strong>${escapeHtml(area)}</strong></p>
        <p style="margin:0 0 16px">Contact: <strong>${escapeHtml(isEmail ? contact : formatPhone(contact))}</strong></p>
        <p style="margin:0;color:#566377;font-size:14px">Sent from the "Notify me" form on the website. Reply or call them when a partner covers this area.</p>
      </div>`,
  });
}

export async function sendOperatorOrderEmail(order: Order): Promise<SendResult> {
  const to = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!to) return { sent: false, skipped: "no_recipient" };
  const { subject, html } = operatorOrderEmail(order);
  return send({ to, subject, html, replyTo: order.contact.email });
}

export async function sendCustomerOrderEmail(order: Order): Promise<SendResult> {
  if (!order.contact.email) return { sent: false, skipped: "no_recipient" };
  const { subject, html } = customerOrderEmail(order);
  return send({ to: order.contact.email, subject, html });
}
