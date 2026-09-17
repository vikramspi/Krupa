import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content Security Policy.
 *
 * 'unsafe-inline' is required for Next's bootstrap scripts and the inline
 * analytics snippets. Tightening this to a nonce-based policy needs a proxy
 * (middleware) that stamps a per-request nonce — worth doing, but it changes how
 * every inline script is emitted, so it is deliberately left as a follow-up.
 */
/**
 * Third parties, by purpose. MSG91's OTP widget loads from verify.msg91.com, talks
 * to control.msg91.com, looks up the visitor's country, and renders hCaptcha or
 * reCAPTCHA Enterprise (chosen in the MSG91 dashboard).
 */
const analytics = {
  script: "https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://connect.facebook.net",
  img: "https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.facebook.com https://googleads.g.doubleclick.net",
  connect: "https://www.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://graph.facebook.com",
  frame: "https://td.doubleclick.net https://www.facebook.com",
};
const otpWidget = {
  script: "https://verify.msg91.com https://js.hcaptcha.com https://*.hcaptcha.com https://www.google.com https://www.gstatic.com",
  style: "https://control.msg91.com https://cdnjs.cloudflare.com https://fonts.googleapis.com https://*.hcaptcha.com",
  font: "https://fonts.gstatic.com",
  img: "https://control.msg91.com https://*.hcaptcha.com https://www.gstatic.com",
  connect: "https://control.msg91.com https://api.msg91.com https://verify.msg91.com https://*.hcaptcha.com https://www.google.com https://ipinfo.io https://api.db-ip.com",
  frame: "https://*.hcaptcha.com https://www.google.com",
};

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${analytics.script} ${otpWidget.script}`,
  `style-src 'self' 'unsafe-inline' ${otpWidget.style}`,
  `img-src 'self' data: blob: ${analytics.img} ${otpWidget.img}`,
  `font-src 'self' data: ${otpWidget.font}`,
  `connect-src 'self' ${analytics.connect} ${otpWidget.connect}${isDev ? " ws: http://localhost:*" : ""}`,
  `frame-src 'self' ${analytics.frame} ${otpWidget.frame}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), interest-cohort=()" },
  // HSTS only in production — it must never be sent over plain-HTTP localhost.
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Development only: extra hostnames allowed to load dev resources — e.g. your LAN
  // IP, for testing on a phone or where a captcha refuses "localhost".
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? "").split(",").map((host) => host.trim()).filter(Boolean),
  poweredByHeader: false,
  // nodemailer is a Node-only library; keep it out of the bundler.
  serverExternalPackages: ["nodemailer"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
