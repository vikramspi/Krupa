# Krupa Laundry — Customer Website

The customer-facing website — a responsive site that works in any phone or desktop browser, with nothing to install. Customers discover the service, get matched with a nearby laundry partner, book a pickup, and track the order end to end.

**What's real:** two ways to sign in (phone OTP, or email + password with verified email), customer accounts, saved addresses, laundry partners, order placement, order history and tracking — all in Postgres (Supabase), reached only through server-side route handlers.

**What's placeholder:** the 8 partner rows are obviously fictional ("Placeholder Vendor 1"…) pending real partners — see [Filling in real vendors](#filling-in-real-vendors). The service catalogue, service areas and testimonials are still local reference data in `src/data/`.

> Out of scope by design: online payments (cash/UPI on delivery only), and any operator/vendor dashboard — the operator works directly in Supabase.

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the required values
npm run dev                    # http://localhost:3000
npm run build                  # production build (also type-checks)
npm run lint
npm run typecheck
```

Requires Node 20.9+.

**Before the site will work**, run `supabase/migrations/0001_init.sql` in the Supabase SQL editor, then set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SESSION_SECRET` (`openssl rand -hex 32`). Without them, ordering, sign-in, account and tracking return a clear 503 while the marketing pages keep working.

## The Krupa platform

This is one of three websites sharing one Supabase database:

| Website | Folder | Local URL |
| --- | --- | --- |
| **Customer website** (this repo) | `~/Krupa/krupa` | http://localhost:3000 |
| Partner portal (laundry partners) | `~/Krupa/krupa-vendors` | http://localhost:3001 |
| Admin panel (operator only) | `~/Krupa/krupa-admin` | http://localhost:3002 |

**All migrations live here**, in `supabase/migrations`.

**How an order moves between the three sites:**
1. A customer's order starts as **placed** ("sent to your partner for confirmation").
2. The partner **accepts** it in the portal (→ pickup scheduled) or **declines** it with a reason (→ **cancelled**; the customer and operator are emailed).
3. The partner moves it through picked up → processing → ready → out for delivery → **delivered**. The customer is emailed a "rate your partner" link, and reviews unlock.
4. The operator can override any status from the admin panel.

**Activity log:** every sign-up, sign-in, order, partner action, review and admin change is written to `activity_log` (`src/server/activity.ts`, written after the response) and shown in the admin panel.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** (strict)
- **Supabase (Postgres)** — customers, addresses, vendors, orders, OTP codes
- **bcryptjs** — password hashing (cost 12)
- **Tailwind CSS v4** — design tokens in `src/app/globals.css` (`@theme`)
- **Zod** — schema validation on every API boundary
- **Zustand** — in-progress booking state only (session storage)
- **lucide-react** — icons

## Architecture

```
Browser (React)
  └── src/services/*          the only data seam the UI touches
        └── fetch /api/*      Next.js route handlers  ← the only place secrets live
              ├── src/server/repositories/*   Supabase queries (service role key)
              ├── src/server/otp.ts           hashed one-time codes
              ├── src/server/session.ts       signed httpOnly cookie
              ├── src/server/msg91.ts         SMS delivery
              └── src/server/email.ts         Resend notifications
```

The service role key bypasses RLS, so it never leaves the server. RLS is enabled with **no policies** on every table, meaning a leaked anon key can read nothing. Authorisation is enforced in the route handlers: every query is scoped to the `customer_id` on the verified session cookie.

```
src/
  app/
    (site)/          Marketing, tracking, account, login, legal
    book/            Booking flow (focused checkout shell)
    api/             Route handlers — auth, orders, customers
  components/        layout · marketing · booking · tracking · account · legal · ui
  server/            Server-only: supabase, session, otp, msg91, email, repositories
  services/          Client-side seam: calls /api/*, or reads the mock catalogue
  data/              Mock vendors, catalogue, areas, reviews (not yet in the database)
  lib/               Pure logic: pricing, matching, scheduling, formatting, validation
  hooks/ state/ types/
supabase/migrations/ SQL schema
```

## Database

`supabase/migrations/0001_init.sql` creates:

| Table | Purpose |
| --- | --- |
| `customers` | id, phone (unique, nullable), email (unique, nullable), password_hash (nullable), email_verified_at, google_id (unique, nullable — `0005`), name |
| `addresses` | saved pickup addresses, FK to customers, cascade delete |
| `vendors` | laundry partners — see [Filling in real vendors](#filling-in-real-vendors) |
| `vendor_reviews` | one review per delivered order (`0006`): order FK (unique), vendor, customer, rating 1–5, comment, `is_published` |
| `orders` | order_code (sequence, `KR-10287`+), customer FK, vendor, items jsonb, price breakdown, pickup date/slot, address jsonb, status, timestamps |
| `otp_codes` | phone, **code_hash**, expires_at, attempts |

Columns beyond the original spec — `vendor_id`, `contact_email`, `instructions`, `estimated_delivery_from/to`, `status_history` — are marked in the migration; the site needs them to render tracking and reorder.

**The operator updates order status directly in the Supabase table editor.** The tracking page reads live on every visit, so a status change shows up on the customer's next refresh.

## Authentication

Three doors, **one session**: phone code, email + password, and Google all issue the identical signed httpOnly cookie, so every downstream check is unchanged.

### Phone (OTP) — MSG91 OTP Widget

1. **In the browser**, the login form loads `verify.msg91.com/otp-provider.js` with `exposeMethods: true` and a `captchaRenderId`. MSG91's popup never appears: our own form calls `sendOtp` / `verifyOtp` / `retryOtp`, and MSG91 only draws its captcha (hCaptcha) inside the form.
2. The code length, expiry and resend delay shown in the form come from the widget's dashboard settings (currently 4 digits, 15 minutes, 10 seconds). If MSG91's *invisible verification* confirms the number without a code, the code step is skipped.
3. A successful `verifyOtp` returns an **access token**, which proves nothing on its own. The browser posts it to `POST /api/auth/otp/widget`.
4. **On the server**, the token is checked with `POST https://control.msg91.com/api/v5/widget/verifyAccessToken` using `MSG91_AUTHKEY`:
   - Only `type: "success"` counts. MSG91 returns HTTP 200 even for invalid tokens.
   - The number MSG91 returns (`"91XXXXXXXXXX"`) must match the number the customer typed, and **MSG91's number is the one put on the session**.
   - A confirmed token is accepted once per server instance.
   - Tokens are never logged.
5. The signed httpOnly session cookie (`SameSite=Lax`, `Secure` in production, 30 days) is then set. Someone already signed in by email or Google gets the number attached to their existing account.

**Testing locally:**
- hCaptcha refuses `localhost`. Open the site via your LAN IP (e.g. `http://192.168.0.102:3000`) and list that IP in `DEV_ALLOWED_ORIGINS`.
- The Content Security Policy in `next.config.ts` allows MSG91, hCaptcha and reCAPTCHA.

**Without the widget settings:**
- In local development, a server-generated code (HMAC-hashed, 5-minute expiry, 5 attempts; `POST /api/auth/otp` + `/api/auth/otp/verify`) is shown on screen.
- In production that route refuses, so nobody can order without a real SMS check.

### Email + password

- Passwords are hashed with **bcrypt, cost 12** — never the OTP HMAC, which is built for 5-minute codes.
- **Email must be verified before the account can log in.** Sign-up emails a signed link; until it's clicked, login returns "confirm your email first". An unverified account can't authenticate at all.
- **Didn't get the confirmation email?** The login screen offers **Resend confirmation email** (`POST /api/auth/verify-email/resend`), with a generic response and rate limits.
- **Forgot password also works before the email is confirmed.** The link can only be opened from the inbox, so completing a reset confirms the address as well. This rescues accounts whose owner forgot the sign-up password.
- **Password reset** emails a signed, 1-hour link. Completing it changes the password hash, which invalidates that link and every other outstanding one — the links are signed over the current hash, so single-use needs no token table.
- Sign-up, login and reset-request are all rate limited (per email and per IP). Passwords, hashes and tokens are never logged.
- Email sign-up requires a working email transport — without one the endpoint refuses rather than creating an account that could never be verified.

### Sign in with Google

OAuth 2.0 authorization code flow with PKCE, using [arctic](https://arcticjs.dev). Needs migration `0005_google_auth.sql`, plus `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The button only appears when both are set.

1. `GET /api/auth/google?next=…` stores a random `state` and PKCE verifier in 10-minute httpOnly cookies (scoped to `/api/auth/google`), then redirects to Google with the `openid email profile` scopes.
2. `GET /api/auth/google/callback` checks `state`, then exchanges the code for an ID token and checks the token's issuer, audience and expiry. The flow cookies are single use.
3. **Account matching:**
   - It matches on **`google_id`** (the token's `sub`) first.
   - If there's no match, it looks up the **email** and links the Google account to that customer.
   - If there's still no match, it creates a new account with **no password**.
   - A Google email that isn't verified is refused.
   - An email already linked to a *different* Google account is refused as a conflict.
4. **Linking an unconfirmed email account:** Google has just proved ownership of the address, so the account's email is marked verified and **any existing password is removed**. Otherwise someone who registered your address first could keep a way in.
5. It issues the same session cookie as the other methods. Accounts without a verified phone land on `/login`, which asks for the phone before checkout.
6. Failures redirect to `/login?google=cancelled|expired|unverified|conflict|error|unavailable|rate_limited`, each with its own message. Codes and tokens are never logged.

**Forgot password on a Google-only account.** The response is the same generic message as always. The email that goes out says the account signs in with Google, and includes a single-use link to set a first password if the customer wants one.

**Google Cloud setup:**
- The OAuth client's **Authorised redirect URIs** must include `<NEXT_PUBLIC_SITE_URL>/api/auth/google/callback` for each environment, e.g. `http://localhost:3000/api/auth/google/callback` and `https://krupalaundry.in/api/auth/google/callback`.
- While the consent screen is in **Testing**, only the listed test users can finish signing in. Click **Publish app** before launch.

### Checkout always requires a verified phone

An email or Google session carries no phone, so `POST /api/orders` returns `phone_required` until one is verified. The booking flow shows the OTP step at checkout, and the verified number is attached to the **existing** account.

### Known limitation: no account linking

Phone-only and email/Google accounts are separate rows. (Google and email + password *do* link automatically when the address matches.) Someone who orders with their phone and later signs up with an email gets a **second account — the earlier order history won't appear there**, and vice versa. Verifying a phone that already belongs to another account is refused rather than silently merging. A linking/merge flow is still to be built.

## Vendor reviews

Customers can rate a laundry partner, and everyone can read those reviews in the partner's details during booking. Needs migration `0006_vendor_reviews.sql`. Until it runs, the site works and simply shows no reviews.

- **Only real customers can review.**
  - The review form appears on **My account → order details**, and a "Rate" link on the order list, once the order's status is **delivered**. The operator sets that status in Supabase.
  - The server checks that the order belongs to the signed-in customer and has been delivered.
  - One review per order; the customer can edit it later.
- **What's public:** star rating, comment (up to 1000 characters), date, a "Verified order" label, and the reviewer's **first name + last initial**.
- **Rating shown for a partner:** the average of its published reviews, with the count. A partner with no reviews shows the `rating` entered in the `vendors` table, or no stars if that's empty.
- **Moderation:** set `is_published = false` on a row in the Supabase table editor to hide it. It then drops out of the list and the average. An edit by the customer doesn't re-publish it.

## API

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /api/auth/register` | — | Create an email account, send verification link |
| `GET /api/auth/verify-email` | — | Confirm the emailed link |
| `POST /api/auth/verify-email/resend` | — | Re-send the confirmation link |
| `POST /api/auth/login` | — | Email + password sign-in |
| `POST /api/auth/password/forgot` | — | Email a reset link |
| `POST /api/auth/password/reset` | — | Set a new password |
| `GET /api/auth/google` | — | Start Google sign-in (redirects to Google) |
| `GET /api/auth/google/callback` | — | Finish Google sign-in, set session |
| `POST /api/auth/otp/widget` | — | Confirm an MSG91 widget token with MSG91, set session |
| `POST /api/auth/otp` | — | Request a code (dev fallback) |
| `POST /api/auth/otp/verify` | — | Verify, create/find customer, set session |
| `GET /api/auth/session` | cookie | Current customer (or null) |
| `GET /api/vendors/{id}/reviews?offset=` | — | A partner's published reviews + summary |
| `GET` / `PUT /api/orders/{code}/review` | cookie | The customer's own review of a delivered order |
| `DELETE /api/auth/session` | cookie | Sign out |
| `POST /api/orders` | **required** | Place an order |
| `GET /api/orders` | required | Order history |
| `GET /api/orders/{code}` | required | One order, scoped to the customer |
| `POST /api/orders/lookup` | — | Guest tracking by order code + phone |
| `PATCH /api/customers/me` | required | Update name |
| `POST /api/customers/me/addresses` | required | Create/update an address |
| `DELETE /api/customers/me/addresses/{id}` | required | Delete an address |
| `GET /api/vendors/nearby` | — | Partners covering an area, ranked |
| `GET /api/vendors/{id}` | — | One partner |
| `GET /api/vendors/{id}/services` | — | Catalogue priced for that partner |
| `GET /api/vendors/{id}/pickup-slots` | — | Slot availability |
| `GET /api/service-areas/check` | — | Coverage + live partner count |

`POST /api/orders` requires a verified session, rate-limits by IP and phone, rejects honeypot submissions, verifies the order is being placed with the session's own number, and **recomputes the entire order from item IDs** — names, unit prices, pickup fee, discount and delivery window all come from the catalogue, never from the browser. It then writes to Postgres (source of truth) and emails the operator (immediate alert). Email failures are logged but never fail a saved order.

## Email transports

`src/server/email.ts` supports two, picked by whichever is configured (SMTP wins):

| | SMTP (`SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`) | Resend (`RESEND_API_KEY`) |
| --- | --- | --- |
| Domain needed | No | Yes, to reach anyone but the account owner |
| Recipients | Anyone | Account owner only until a domain is verified |
| Best for | Pre-launch testing | Production once `krupalaundry.in` is verified |

For Gmail: enable 2-Step Verification, create an app password at
`myaccount.google.com/apppasswords`, and use it as `SMTP_PASSWORD` (Gmail caps at
roughly 500 messages/day, which is fine pre-launch but not for scale).

With neither configured, email sign-up returns a clear 503 and order emails are
logged and skipped — a saved order is never lost to a mail failure.

## Filling in real vendors

Replacing the placeholder partners is a **table edit, not a code change**. Per partner, in the `vendors` table:

| Column | What to put in it |
| --- | --- |
| `name` | Trading name shown to customers |
| `contact_phone` | 10-digit number — the "Call partner" button and operator emails use it |
| `coverage_areas` | JSON array of area ids they collect from, e.g. `["bandra-west","khar-west"]` (ids are in `src/data/areas.ts`) |
| `offered_service_ids` | JSON array from: `wash-fold`, `wash-iron`, `ironing`, `dry-cleaning`, `premium`, `bedsheets`, `blankets`, `shoes` |
| `turnaround_estimate` | `{"min_hours": 24, "max_hours": 48}` — drives the quoted delivery window |
| `rating` | 0–5, or **leave null** — the UI then hides stars entirely rather than showing zero |
| `is_active` | `false` = not taking orders; customers see "at capacity" and can't select them |
| `price_multiplier` | Applied to catalogue base prices (1.10 = 10% above). **The server recomputes every order from this** |
| `pickup_fee` | Rupees, waived above the free-pickup threshold |
| `latitude` / `longitude` | For distance and "nearest" sorting. Null hides distance rather than guessing |
| `accepts_same_day` | Whether today's pickup slots are offered |

Two states are wired to the data, so they can be checked by editing a row:

- **At capacity** — `is_active = false` (Placeholder Vendor 6 ships this way).
- **No partners found** — an area no row covers (no placeholder covers `gorai`).

## Security

- Secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `MSG91_AUTHKEY`, `GOOGLE_CLIENT_SECRET`, `SMTP_PASSWORD`, `RESEND_API_KEY`) are server-only and never prefixed `NEXT_PUBLIC_`.
- Security headers in `next.config.ts`: CSP, HSTS (production), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `X-Powered-By` removed. The CSP still needs `'unsafe-inline'` for Next's bootstrap and analytics snippets — a nonce-based policy is a known follow-up.
- Rate limiting is in-process (`src/server/rateLimit.ts`); each serverless instance counts separately. Swap in Upstash Redis / Vercel KV as traffic grows — the signature won't change.
- Honeypot field on the booking form, rejected server-side.

## SEO & analytics

`robots.ts`, `sitemap.ts`, canonical/OG/Twitter metadata, a generated OG image and `LocalBusiness` structured data. Personal routes (`/account`, `/track/*`, `/book/*`, `/api/*`) are excluded from indexing. Funnel events fire per booking step, plus `begin_checkout` and a once-per-order `purchase` / Google Ads conversion / Meta `Purchase`.

## Deploying to Vercel

1. Push to GitHub, import in Vercel (framework auto-detected).
2. Add environment variables to **Production** and **Preview** separately. Don't set `NEXT_PUBLIC_ENABLE_DEMO_MODE` in Production.
3. Add the custom domain (HTTPS is automatic) and set `NEXT_PUBLIC_SITE_URL` to it.
4. Verify your Resend sender domain (SPF/DKIM), or order emails won't deliver.
5. Add the production callback URL to the Google OAuth client, and publish the consent screen.
6. Place one test order and confirm: the row appears in `orders`, and the operator email arrives.

## Before real customers

1. **Vendor rows are placeholders.** The 8 rows in the `vendors` table are named "Placeholder Vendor N" on purpose. Replace them with real partners (above) before taking public orders. Coordinates are entered by hand — there's still no geocoding provider.
2. **MSG91 widget:** set `MSG91_WIDGET_ID`, `MSG91_WIDGET_AUTH_TOKEN` and `MSG91_AUTHKEY` in production, and make sure the widget's SMS template is DLT-approved.
3. **Legal pages need your entity details** — each page shows exactly what's missing.
4. **Order status is operator-driven** in the Supabase table editor; there's no vendor-facing tool yet.
5. **Accounts don't link.** See the limitation above — the same person can end up with a phone account and an email account.
