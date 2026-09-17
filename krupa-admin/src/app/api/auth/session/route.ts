import { isAdminEmail } from "@/server/admins";
import { clearSession, readSession } from "@/server/session";

/** GET: the signed-in admin (or null). DELETE: sign out. */
export async function GET() {
  const session = await readSession();
  if (!session || !isAdminEmail(session.email)) return Response.json({ admin: null });
  return Response.json({ admin: { email: session.email, name: session.name } });
}

export async function DELETE() {
  await clearSession();
  return Response.json({ ok: true });
}
