import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Todo } from "@/components/legal/LegalPage";
import { siteConfig } from "@/lib/config";
import { DISCOUNT_CAP, DISCOUNT_THRESHOLD, FREE_PICKUP_THRESHOLD } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms on which Krupa Laundry provides laundry pickup and delivery in Mumbai.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms apply whenever you book a laundry pickup with Krupa Laundry. Please read them — placing an order means you accept them."
    >
      <section>
        <h2>1. About our service</h2>
        <p>
          Krupa Laundry, operated by {siteConfig.legalEntity || <Todo>registered business / entity name</Todo>}, is a
          marketplace. We match you with an independent local laundry partner who collects, cleans and returns your
          items. We select and vet our partners and stay responsible for coordinating your order, but the cleaning
          itself is carried out by the partner assigned to you.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years old and provide an accurate name, mobile number and address within our service
          area. We may refuse or cancel an order if the details are incomplete, inaccurate or outside the areas we
          currently serve.
        </p>
      </section>

      <section>
        <h2>3. Placing an order</h2>
        <p>
          When you place an order you choose a laundry partner, the items to be cleaned, and a pickup date and
          two-hour slot. Your order is an offer to buy the service; it is accepted once we confirm it and assign the
          partner. The item list you enter is an estimate — the final count is confirmed with you at pickup.
        </p>
      </section>

      <section>
        <h2>4. Prices and payment</h2>
        <ul>
          <li>Prices are shown per item before you confirm, and include the partner&apos;s rate for that item.</li>
          <li>Pickup and delivery is free on orders above ₹{FREE_PICKUP_THRESHOLD}; below that, the pickup fee shown at checkout applies.</li>
          <li>Orders above ₹{DISCOUNT_THRESHOLD} receive a 10% discount, capped at ₹{DISCOUNT_CAP}.</li>
          <li>
            <strong>Payment is in cash or by UPI after delivery</strong>, directly to your laundry partner. We do not
            take online payment or store card details.
          </li>
          <li>
            If the items collected differ from what you entered, the price is recalculated at the same per-item rates
            and confirmed with you. You only pay for what is actually collected and cleaned.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Pickup and delivery</h2>
        <p>
          Pickup slots and delivery estimates (typically 24–48 hours after pickup, longer for specialty items) are
          estimates, not guarantees. Delays can happen because of weather, traffic, volume or partner capacity, and we
          will keep you informed when they do. Someone must be available at the address during the slot you choose; if
          nobody is available, see our{" "}
          <Link href="/cancellation-and-refunds">cancellation and refund policy</Link>.
        </p>
      </section>

      <section>
        <h2>6. Your responsibilities</h2>
        <ul>
          <li>Empty all pockets and remove valuables, jewellery and accessories before pickup.</li>
          <li>Point out stains, delicate fabrics and any special care instructions at pickup.</li>
          <li>Make sure the items you hand over are suitable for the service you selected.</li>
        </ul>
      </section>

      <section>
        <h2>7. Items we cannot accept</h2>
        <p>
          For safety and quality reasons partners may decline items that are heavily soiled with hazardous material,
          wet or mildewed, contaminated, or made of fabrics that cannot survive cleaning. Antiques, heirlooms and items
          of exceptional value should not be sent through the service.
        </p>
      </section>

      <section>
        <h2>8. Damage, loss and our liability</h2>
        <p>
          Cleaning carries inherent risk, especially for delicate and older fabrics. If an item is lost or damaged
          because of our or our partner&apos;s fault, we will work with you on a fair resolution as set out in our{" "}
          <Link href="/cancellation-and-refunds">cancellation and refund policy</Link>. Except where the law says
          otherwise, our total liability for any order is limited to{" "}
          <Todo>liability cap, e.g. 10× the cleaning charge for the affected item</Todo>, and we are not liable for
          indirect or consequential losses. Nothing in these terms limits liability that cannot be limited by law.
        </p>
      </section>

      <section>
        <h2>9. Your account</h2>
        <p>
          You sign in with your mobile number. Keep your number and device secure — anyone with access to them can see
          your order history and saved addresses. Tell us immediately if you believe your account has been misused.
        </p>
      </section>

      <section>
        <h2>10. Acceptable use</h2>
        <p>
          Don&apos;t use the service unlawfully, place fraudulent or automated orders, or attempt to disrupt or probe
          the site. We may suspend or refuse service where we reasonably believe this has happened.
        </p>
      </section>

      <section>
        <h2>11. Intellectual property</h2>
        <p>
          The Krupa Laundry name, branding and site content belong to us and may not be copied or used without our
          permission.
        </p>
      </section>

      <section>
        <h2>12. Changes and governing law</h2>
        <p>
          We may update these terms; the version in force is the one published here when you place your order. These
          terms are governed by the laws of India, and the courts at <Todo>jurisdiction, e.g. Mumbai, Maharashtra</Todo>{" "}
          have exclusive jurisdiction over any dispute.
        </p>
      </section>
    </LegalPage>
  );
}
