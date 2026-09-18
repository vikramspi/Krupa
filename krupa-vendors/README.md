# Krupa Laundry — Partner Portal

The website laundry partners (vendors) use to handle their Krupa Laundry orders. It is one of three websites sharing one Supabase database:

| Website | Folder | Local URL | Who uses it |
| --- | --- | --- | --- |
| Customer website | `~/Krupa/krupa` | http://localhost:3000 | Customers |
| **Partner portal** | `~/Krupa/krupa-vendors` | http://localhost:3001 | Laundry partners |
| Admin panel | `~/Krupa/krupa-admin` | http://localhost:3002 | The operator |

Database migrations live in **one place**: `~/Krupa/krupa/supabase/migrations`. This site needs `0007_vendor_portal_and_admin.sql`.

## What partners can do
- **Log in:**
  - With the **mobile number** the operator registered: an SMS code via the MSG91 widget. The number is checked before any SMS is sent.
  - Or with **email + password**: set from the operator's invite link, with "Forgot password".
- **Orders**, in three tabs that refresh every 30 seconds:
  - **New:** accept, or decline with a reason.
  - **In progress:** move the order through Picked up → Processing → Ready → Out for delivery → Delivered.
  - **Completed:** delivered and cancelled orders.
- **Order page:** pickup time and address (with a Google Maps link), a "Call customer" button, the item list, the amount to collect, and the history.

**Data access:** every query is scoped to the partner's own `vendor_id`. Two partners acting on the same order at once can't both win: a stale action gets "refresh" (HTTP 409).

**What happens on each action:**
- Each change is added to the customer's tracking timeline and to the admin activity log.
- **Declining** cancels the order and emails the customer (if they gave an email) and the operator.
- **Delivered** emails the customer a "Rate your partner" link, which unlocks reviews on the customer site.

## Sessions and security
- **Cookie:** `krupa_partner_session`, signed with this site's own `SESSION_SECRET`, lasting 14 days.
- **Every request re-checks the login in the database**, so a login the operator disables stops working immediately.
- **Passwords:** bcrypt-hashed.
- **Invite and reset links:** random tokens; only their SHA-256 hash is stored, and each works once. Invites last 7 days, resets 1 hour.
- **Development-only routes:** `/api/auth/otp` and `/api/auth/otp/verify` return the code on screen when the MSG91 widget can't run (for example, its captcha refuses `localhost`). They return 404 in production.

## Environment (`.env.local`)
| Variable | |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | This site's address; used in password-reset links |
| `CUSTOMER_SITE_URL` | Used in "book again" and "rate your partner" emails |
| `SESSION_SECRET` | 32+ random bytes, **different from the other two sites** |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Same database as the customer website |
| `MSG91_WIDGET_ID`, `MSG91_WIDGET_AUTH_TOKEN`, `MSG91_AUTHKEY` | SMS login |
| `SMTP_*`, `EMAIL_FROM`, `ORDER_NOTIFICATION_EMAIL` | Emails |
| `NEXT_PUBLIC_SUPPORT_PHONE` | Shown on the login page |
| `DEV_ALLOWED_ORIGINS` | Development only (e.g. your LAN IP, for the captcha) |

## Run
```bash
npm install
npm run dev   # http://localhost:3001
```

`src/components/ui`, `src/lib/format.ts` and a few other helpers are copied from the customer website. Keep them in step when you change one.
