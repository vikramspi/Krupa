import { logActivity, shortName } from "./activity";
import "server-only";
import type { Customer } from "@/types";
import { attachPhoneToCustomer, findCustomerAuthRow, getCustomerById, upsertCustomerByPhone } from "./repositories/customers";
import { newSession, readSession, writeSessionCookie } from "./session";

/**
 * Opens a session for a phone number that has ALREADY been proven — by our own
 * OTP check or by MSG91 confirming a widget access token. Never call this with a
 * number the browser merely claims.
 *
 * Someone already signed in without a phone (email or Google) keeps the same
 * account: the number is attached to it rather than creating a second one.
 * Merging two existing accounts is deliberately not supported (see README).
 */
export async function completePhoneSignIn(
  verifiedPhone: string,
  name?: string,
): Promise<{ customer: Customer | null; needsName: boolean }> {
  const session = await readSession();
  const current = session ? await findCustomerAuthRow(session.customerId) : null;

  let customerId: string;
  let customerName: string | null;
  if (current && !current.phone) {
    await attachPhoneToCustomer(current.id, verifiedPhone);
    customerId = current.id;
    customerName = current.name;
    logActivity({
      actorType: "customer", actorId: customerId, actorLabel: shortName(customerName),
      action: "customer.phone_verified", entityType: "customer", entityId: customerId,
      summary: `${shortName(customerName)} verified a mobile number`,
    });
  } else {
    const row = await upsertCustomerByPhone(verifiedPhone, name);
    customerId = row.id;
    customerName = row.name;
    const isNew = Date.now() - new Date(row.created_at).getTime() < 30_000;
    logActivity({
      actorType: "customer", actorId: customerId, actorLabel: shortName(customerName),
      action: isNew ? "customer.signed_up" : "customer.signed_in", entityType: "customer", entityId: customerId,
      summary: isNew ? `New customer signed up with a mobile number` : `${shortName(customerName)} signed in with a mobile number`,
    });
  }

  await writeSessionCookie(newSession(verifiedPhone, customerId));
  return { customer: await getCustomerById(customerId), needsName: !customerName };
}
