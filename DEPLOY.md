# Deploying Krupa Laundry to Vercel

Three websites, one repo, one Supabase database. Deploy each folder as its own Vercel project.

| Project (suggested name) | Root Directory | Who sees it |
| --- | --- | --- |
| `krupa-customer` | `krupa` | Everyone (later `krupalaundry.in`) |
| `krupa-vendors` | `krupa-vendors` | Laundry partners you register |
| `krupa-admin` | `krupa-admin` | You only (Google accounts in `ADMIN_EMAILS`) |

Nobody can reach the vendor or admin sites without a login, and neither is listed in search results. Still, keep their addresses private and give the admin one an unguessable name.

> **Vercel plan:** the free Hobby plan is for non-commercial use. Once you take real orders, move to Pro.

---

## 1. Create each project

In Vercel: **Add New → Project → Import `vikramspi/Krupa`**. Then, before the first deploy:

- **Root Directory:** the folder from the table above. Vercel detects Next.js; leave the build settings alone.
- **Environment Variables:** paste the ones for that project (below), for **Production** *and* **Preview**.

Deploy. You get an address like `krupa-customer.vercel.app` — that's the one you can share today.

---

## 2. Environment variables

Copy the secret values from your local `.env.local` files. **Never commit them.**

### All three
```
SUPABASE_URL                 https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY    <secret>
SESSION_SECRET               a DIFFERENT random value per project (openssl rand -hex 32)
NEXT_PUBLIC_SITE_URL         that project's own address, no trailing slash
```

### Customer website (`krupa`)
```
NEXT_PUBLIC_SUPPORT_PHONE, NEXT_PUBLIC_SUPPORT_EMAIL
NEXT_PUBLIC_LEGAL_ENTITY, NEXT_PUBLIC_LEGAL_ADDRESS     (once you have them)
ORDER_NOTIFICATION_EMAIL
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
MSG91_WIDGET_ID, MSG91_WIDGET_AUTH_TOKEN, MSG91_AUTHKEY
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
```
Do **not** set `NEXT_PUBLIC_ENABLE_DEMO_MODE` or `DEV_ALLOWED_ORIGINS` in production.

### Vendor portal (`krupa-vendors`)
```
CUSTOMER_SITE_URL            the customer website's address
NEXT_PUBLIC_SUPPORT_PHONE
ORDER_NOTIFICATION_EMAIL
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
MSG91_WIDGET_ID, MSG91_WIDGET_AUTH_TOKEN, MSG91_AUTHKEY
```

### Admin panel (`krupa-admin`)
```
ADMIN_EMAILS                 your Google accounts, comma-separated
VENDOR_PORTAL_URL            the vendor portal's address
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
```

---

## 3. After the first deploy

1. **Google Cloud → APIs & Services → Credentials → your OAuth client → Authorised redirect URIs**, add:
   - `https://<customer address>/api/auth/google/callback`
   - `https://<admin address>/api/auth/google/callback`
   Add the same for your real domains later. While the consent screen is in **Testing**, only listed test users can sign in — press **Publish app** before launch.
2. **MSG91 → OTP widget:** allow your live domains, otherwise the SMS login and captcha won't run (they refuse unknown hosts).
3. **Lock the admin panel further:** Vercel **Password Protection** (Pro), or free **Cloudflare Access**, on the admin address only.
4. **Smoke test, in this order:**
   - Admin: sign in, add one vendor, add a login for it.
   - Vendor portal: log in as that vendor.
   - Customer site: sign up, verify a mobile number, place an order.
   - Vendor portal: accept it, then move it to delivered.
   - Customer site: leave a review.
   - Delete the test order and test accounts afterwards.

---

## 4. Custom domains (when you're ready)

In each project: **Settings → Domains**.

| Site | Suggested domain |
| --- | --- |
| Customer | `krupalaundry.in` and `www.krupalaundry.in` |
| Vendors | `partners.krupalaundry.in` |
| Admin | something unguessable, e.g. `ops-7x2k.krupalaundry.in` |

Then update `NEXT_PUBLIC_SITE_URL`, `CUSTOMER_SITE_URL` and `VENDOR_PORTAL_URL` to the new addresses, add the new Google callback URLs, allow the domains in MSG91, and redeploy.

---

## 5. Before real customers

- Replace the 8 placeholder vendors with real ones (admin → Vendors), each with a login.
- Confirm prices, the pickup fee, free-pickup threshold and the 10% offer.
- Fill in the legal entity name, address and jurisdiction (the legal pages flag what's missing).
- Rotate the Supabase secret key and update it in all three projects.
- Run through the smoke test above with a real vendor.
