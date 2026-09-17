import "server-only";
import { findUserByLinkHash, type VendorUserAuthRow } from "./repositories/vendorUsers";
import { hashLinkToken } from "./tokens";

export type LinkKind = "invite" | "reset";

/** The login an invite/reset link belongs to, if the link is still valid. */
export async function resolveLink(kind: LinkKind, token: string): Promise<VendorUserAuthRow | null> {
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) return null;
  const row = await findUserByLinkHash(kind, hashLinkToken(token));
  if (!row || !row.is_active) return null;
  const expires = kind === "invite" ? row.invite_expires_at : row.reset_expires_at;
  if (!expires || new Date(expires).getTime() <= Date.now()) return null;
  return row;
}
