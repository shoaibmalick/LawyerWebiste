import { auth } from "@/auth";

/**
 * Thrown by `requireAdmin`.
 *
 * A named class rather than a bare Error so a Route Handler can tell "not
 * signed in" apart from "something broke" and answer 401 instead of 500. A
 * Server Action does not need the distinction — nothing renders its exception
 * — but a route that 500s on every unauthenticated probe is both the wrong
 * status and a steady stream of noise in whatever watches the error rate.
 *
 * Still an Error subclass, so every existing `await requireAdmin()` call site
 * behaves exactly as before.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Assert the caller is a signed-in admin, or throw.
 *
 * Why this is not `if (!session)`: admin and customer are two separate
 * credential spaces sharing one NextAuth instance (see the Auth.js note in
 * CLAUDE.md), so a signed-in *customer* has a perfectly valid session. A bare
 * truthiness check therefore admits any logged-in customer to every admin
 * mutation — cancelling other people's bookings, marking invoices paid,
 * approving their own reviews.
 *
 * proxy.ts already gates /dashboard/:path* by role, and a Server Action POSTs
 * to the path it was rendered from, so that covers these today. This is the
 * defence in depth CLAUDE.md's "Never Do" list asks for: the action must not
 * depend on a routing rule staying correct forever.
 *
 * Kept in one place so the check cannot drift between call sites.
 *
 * Returns who the admin is, for actions that record authorship — booking call
 * notes have to say who made the call. Email rather than an id because
 * Auth.js's DefaultSession["user"] has no id (see types/next-auth.d.ts), and
 * email is the durable identifier here. Every existing `await requireAdmin()`
 * call site keeps working: they simply ignore the return value.
 */
export async function requireAdmin(): Promise<{
  email: string | null;
  name: string | null;
}> {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new UnauthorizedError();
  }
  return { email: session.user.email ?? null, name: session.user.name ?? null };
}
