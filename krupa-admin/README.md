# Krupa Laundry — Admin Panel

The operator's view of the whole platform. It is one of three websites sharing one Supabase database: the customer website on `:3000`, the partner portal on `:3001`, and **this admin panel on `:3002`**. Migrations live in `~/Krupa/krupa/supabase/migrations`, and this site needs `0007`.

## Sign-in: you only
- **Google sign-in** (arctic, PKCE), accepted only for the Google accounts in `ADMIN_EMAILS`.
- **The allowlist is checked twice:** at sign-in and on **every** API request, so removing an address locks that account out immediately. Refused attempts are logged.
- **Session cookie:** `krupa_admin_session`, SameSite=Strict, lasting 12 hours, signed with this site's own `SESSION_SECRET`.
- **Google Cloud setup:** add `<NEXT_PUBLIC_SITE_URL>/api/auth/google/callback` to the OAuth client's redirect URIs (locally, `http://localhost:3002/api/auth/google/callback`). It can reuse the customer site's OAuth client.

## Pages
| Page | What it does |
| --- | --- |
| **Dashboard** | Orders waiting for a partner (flagged after 30 minutes), in progress, today, delivered this week and value collected, customers, vendors taking orders, review average, latest activity |
| **Orders** | All orders, filtered by status or vendor, searchable by order ID or customer mobile. Each order page shows customer and vendor (with call links), items, the customer-visible timeline, the review and the activity trail. **Change status** overrides any status; the note is shown to the customer and is required for cancellations |
| **Vendors** | List with open/total orders, review score, areas and login count. **Add vendor** and edit: name, contact, services, coverage areas, price multiplier, pickup fee, turnaround, starting rating, location, same-day pickup, taking orders or paused. **Logins** tab (see below). **Orders** tab |
| **Customers** | Search by name, email or mobile. Each customer page shows sign-in methods, orders and account activity |
| **Reviews** | Every review; **Hide / Publish**. Hidden reviews disappear from the customer site and from ratings |
| **Activity** | The platform-wide feed (sign-ups, sign-ins, orders, partner actions, reviews, admin changes), filterable by who acted |

**Partner logins** (on each vendor's Logins tab):
- A login with a **mobile number** signs in with an SMS code.
- A login with an **email** is sent an invite to set its own password; you never choose it.
- **Resend invite** / **Send password link** sends a fresh link.
- **Disable** signs that person out immediately.

Every admin change is written to the activity log.

## Environment (`.env.local`)
| Variable | |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | This site's address; used for the Google callback |
| `VENDOR_PORTAL_URL` | Used in invite links |
| `ADMIN_EMAILS` | Comma-separated Google accounts allowed in |
| `SESSION_SECRET` | 32+ random bytes, different from the other sites |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Same database |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `SMTP_*`, `EMAIL_FROM` | Invite emails |

## Run
```bash
npm install
npm run dev   # http://localhost:3002
```

**Deploy:** deploy this site separately (e.g. `admin.krupalaundry.in`) and keep the URL private. Access is still protected by the allowlist.
