import "server-only";
import type { VendorSessionUser } from "@/types";
import { logActivity } from "./activity";
import { findSessionUser, findUserByPhone, recordLogin } from "./repositories/vendorUsers";
import { writeSession } from "./session";

/** Opens a session for a phone number that has ALREADY been verified. */
export async function completePhoneLogin(verifiedPhone: string): Promise<VendorSessionUser | null> {
  const row = await findUserByPhone(verifiedPhone);
  if (!row || !row.is_active) return null;
  const user = await findSessionUser(row.id);
  if (!user) return null;
  await writeSession(user.id, user.vendor.id);
  await recordLogin(user.id);
  logActivity({
    actorType: "vendor", actorId: user.id, actorLabel: `${user.name} (${user.vendor.name})`,
    action: "vendor.signed_in", entityType: "vendor", entityId: user.vendor.id,
    summary: `${user.name} signed in to the partner portal for ${user.vendor.name}`,
  });
  return user;
}
