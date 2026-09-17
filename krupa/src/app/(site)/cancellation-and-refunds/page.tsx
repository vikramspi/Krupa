import type { Metadata } from "next";
import { LegalPage, Todo } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Cancellation & Refunds",
  description: "How to cancel or reschedule a Krupa Laundry pickup, and what happens if something goes wrong.",
  alternates: { canonical: "/cancellation-and-refunds" },
};

export default function CancellationPage() {
  return (
    <LegalPage
      title="Cancellation & Refund Policy"
      intro="You pay only after your laundry is delivered, so there is rarely anything to refund. This policy explains how to cancel or reschedule, and what we do if a pickup is missed or an item is damaged or lost."
    >
      <section>
        <h2>1. Cancelling or rescheduling a pickup</h2>
        <ul>
          <li>
            <strong>Free until 1 hour before your slot.</strong> Cancel or move your pickup up to one hour before the
            start of your slot at no charge — call or email us with your order ID.
          </li>
          <li>
            <strong>Less than 1 hour before.</strong> The partner may already be on the way. We will always try to
            accommodate you, but a <Todo>late-cancellation fee, if any — else state &ldquo;no fee&rdquo;</Todo> may
            apply.
          </li>
          <li>
            <strong>After collection.</strong> Once your items have been collected and cleaning has begun, the order
            cannot be cancelled. We will return the items to you and the cleaning charge stands.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Missed pickups</h2>
        <p>
          If nobody is available at your address during the slot, our executive will call you and wait a short while. If
          we still cannot collect, we will contact you to rebook at no charge. Repeated missed pickups may mean we ask
          you to confirm before we schedule again. If <em>we</em> miss your slot, you pay nothing and we will rebook at
          a time that suits you.
        </p>
      </section>

      <section>
        <h2>3. If you are not happy with the cleaning</h2>
        <p>
          Tell us within <Todo>re-clean window, e.g. 24 hours</Todo> of delivery and we will have the item re-cleaned
          free of charge. Some stains and marks are permanent or cannot be removed without damaging the fabric — where
          that is the case, we will explain what was tried.
        </p>
      </section>

      <section>
        <h2>4. Damaged or lost items</h2>
        <ul>
          <li>
            Report damage or a missing item within <Todo>claim window, e.g. 48 hours</Todo> of delivery, with your order
            ID and a photo where relevant.
          </li>
          <li>We investigate with the laundry partner and respond within <Todo>response time, e.g. 3 working days</Todo>.</li>
          <li>
            Where the item was lost or damaged through our or our partner&apos;s fault, compensation is{" "}
            <Todo>compensation basis, e.g. up to 10× the cleaning charge for that item</Todo>, taking the item&apos;s age
            and condition into account.
          </li>
          <li>
            We cannot accept claims for items damaged by pre-existing wear, manufacturing defects, missing or incorrect
            care labels, or for valuables left in pockets.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Billing corrections</h2>
        <p>
          Because the final item count is confirmed at pickup and you pay on delivery, billing disputes are rare. If you
          believe you were charged incorrectly, contact us within <Todo>billing dispute window, e.g. 7 days</Todo> with
          your order ID and we will review the count and rates and correct any error.
        </p>
      </section>

      <section>
        <h2>6. Refund method and timing</h2>
        <p>
          Where a refund is due — for example, an amount collected in error — it is returned by UPI or cash to the
          number or person who paid, within <Todo>refund timeline, e.g. 5–7 working days</Todo> of us agreeing the
          refund.
        </p>
      </section>

      <section>
        <h2>7. How to reach us</h2>
        <p>
          Call or email us with your order ID (for example KR-10284). Orders placed with an email address also receive a
          confirmation you can reply to directly.
        </p>
      </section>
    </LegalPage>
  );
}
