import { readSession, clearSession } from "@/server/session";
import { findSessionUser } from "@/server/repositories/vendorUsers";
import { isDatabaseConfigured } from "@/server/env";

/** GET: the signed-in partner (or null). DELETE: log out. */
export async function GET() {
  const session = await readSession();
  if (!session || !isDatabaseConfigured()) return Response.json({ user: null });
  try {
    const user = await findSessionUser(session.userId);
    if (!user || user.vendor.id !== session.vendorId) {
      await clearSession();
      return Response.json({ user: null });
    }
    return Response.json({ user });
  } catch {
    return Response.json({ error: { message: "We couldn't check your login.", code: "network" } }, { status: 503 });
  }
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
