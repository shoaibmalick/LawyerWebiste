import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/auth-guards";
import { bookingService } from "@/server/services/bookingService";

/**
 * A customer's own booking history.
 *
 * **Takes no email argument, deliberately.** It used to take one and trust it
 * completely, which made "whose history is this?" a property of the caller
 * rather than of this function. That was safe only because its single caller
 * passed `session.user.email`; a second caller, or a `"use server"` directive
 * on this file, would have turned it into an arbitrary-customer-history read
 * with no code change here at all.
 *
 * Deriving the identity from the session inside the function removes the
 * possibility rather than relying on everyone remembering. There is now no
 * argument an attacker could supply, because there is no argument.
 *
 * Asserts `role === "customer"` specifically, not merely that a session
 * exists: admin and customer share one Auth.js instance, so a signed-in admin
 * has a perfectly valid session and would otherwise read a customer's history
 * through the customer surface.
 */
export async function listMyBookings() {
  const session = await auth();

  if (session?.user?.role !== "customer" || !session.user.email) {
    throw new UnauthorizedError();
  }

  return bookingService.listBookingsByEmail(session.user.email);
}
