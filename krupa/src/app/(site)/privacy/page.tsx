import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/legal/LegalPage";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Krupa Laundry collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what personal information Krupa Laundry collects when you book a laundry pickup, why we collect it, who we share it with, and the choices you have."
    >
      <section>
        <h2>1. Who we are</h2>
        <p>
          Krupa Laundry is an on-demand laundry service operating in Mumbai, India. We connect customers with local
          laundry partners who collect, clean and return their clothes. This service is operated by{" "}
          {siteConfig.legalEntity || <Todo>registered business / entity name</Todo>}, whose registered address is{" "}
          {siteConfig.legalAddress || <Todo>registered address</Todo>}.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <ul>
          <li>
            <strong>Contact details</strong> — your name, mobile number, and email address if you choose to provide one.
          </li>
          <li>
            <strong>Account and sign-in details</strong> — if you create an account: your email address, a securely hashed
            password (we never store the password itself), and, if you sign in with Google, your Google account ID, name
            and email address. We don&apos;t receive your Google password or access anything else in your Google account.
          </li>
          <li>
            <strong>Location</strong> — only if you tap &ldquo;Use my current location&rdquo; and allow it in your browser:
            your approximate position, used to find your neighbourhood and nearby partners.
          </li>
          <li>
            <strong>Pickup and delivery address</strong> — flat/building, street, landmark, area and pincode, plus any
            pickup instructions you add.
          </li>
          <li>
            <strong>Order information</strong> — the items you send, quantities, the laundry partner assigned, prices,
            pickup slot, order status and history.
          </li>
          <li>
            <strong>Reviews</strong> — if you rate a laundry partner after a delivered order: your star rating and comment.
            Reviews are public and show only your first name and last initial.
          </li>
          <li>
            <strong>Saved preferences</strong> — addresses you choose to save to your account for faster booking.
          </li>
          <li>
            <strong>Technical and usage data</strong> — device and browser information, pages visited and actions taken,
            collected through analytics and advertising tools (section 5).
          </li>
        </ul>
        <p>
          We do not collect payment card details. Payment is made in cash or by UPI directly to your laundry partner
          after delivery.
        </p>
      </section>

      <section>
        <h2>3. How we use your information</h2>
        <ul>
          <li>To accept, schedule and fulfil your laundry order.</li>
          <li>To share the details a laundry partner needs to collect from and deliver to you.</li>
          <li>To contact you about your order by phone, SMS or email.</li>
          <li>To show you your order history and let you reorder.</li>
          <li>To measure and improve our service and our advertising.</li>
          <li>To meet legal, tax and accounting obligations.</li>
        </ul>
      </section>

      <section>
        <h2>4. Who we share it with</h2>
        <ul>
          <li>
            <strong>Laundry partners</strong> — the partner handling your order receives your name, phone number, pickup
            address, pickup time and item list, so they can complete the service.
          </li>
          <li>
            <strong>Service providers</strong>, who process data only on our instructions:
            <ul>
              <li>Supabase — stores your account, saved addresses and orders in its database.</li>
              <li>MSG91 — sends the one-time SMS code that verifies your mobile number, and runs a captcha (hCaptcha) to block automated abuse.</li>
              <li>Google — if you choose &ldquo;Continue with Google&rdquo;, to sign you in; and Gmail, which delivers our emails.</li>
              <li>Resend — may be used to send transactional emails (order confirmations and account emails).</li>
              <li>Our website hosting provider, to run this site.</li>
            </ul>
          </li>
          <li>
            <strong>Analytics and advertising</strong> — see section 5.
          </li>
          <li>
            <strong>Legal</strong> — where required by law, regulation or valid legal process.
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section>
        <h2>5. Analytics, cookies and advertising</h2>
        <p>
          We use Google Analytics to understand how the site is used, and Google Ads and the Meta (Facebook) Pixel to
          measure the effectiveness of our advertising. These tools set cookies or similar identifiers and may receive
          your device and browsing information, including which pages you visited and whether you placed an order. This
          helps us know which campaigns bring in customers.
        </p>
        <p>
          We store a small amount of information in your browser (local and session storage) to keep your booking
          progress and sign-in state. This is essential to the booking flow and is not used for advertising. You can
          clear it at any time through your browser settings, and you can block cookies through your browser or use the
          opt-out tools offered by Google and Meta.
        </p>
      </section>

      <section>
        <h2>6. How long we keep it</h2>
        <p>
          We keep order records for as long as needed to provide the service and to meet legal, tax and accounting
          requirements — ordinarily <Todo>retention period, e.g. 7 years for tax records</Todo>. Saved addresses and
          account details are kept until you ask us to delete them.
        </p>
      </section>

      <section>
        <h2>7. Your rights</h2>
        <p>
          You can ask us to access, correct or delete your personal information, or to stop using it for marketing. You
          can update your name, email and saved addresses yourself from your account page. For anything else, contact us
          using the details below and we will respond within a reasonable period.
        </p>
        <p>
          Under India&apos;s Digital Personal Data Protection Act, 2023, you may also raise a grievance with our
          grievance officer: <Todo>grievance officer name and contact</Todo>.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use HTTPS across the site and limit access to order information to the people who need it to run the
          service. No method of transmission or storage is completely secure, but we take reasonable steps to protect
          your information and will tell you about any breach as required by law.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>Our service is intended for adults. We do not knowingly collect information from children under 18.</p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          If we make material changes we will update this page and change the &ldquo;last updated&rdquo; date above.
          Continuing to use the service after a change means you accept the updated policy.
        </p>
      </section>
    </LegalPage>
  );
}
