import { z } from "zod";

/**
 * A field no human ever fills in, and most bots always do.
 *
 * Form-spam scripts fill every input they can find, because that is the only
 * strategy that works across sites they have never seen. So a field that is
 * hidden from people but present in the DOM separates the two populations
 * without asking a patient to identify traffic lights.
 *
 * Named `website` on purpose: it has to look worth filling. A field called
 * `honeypot` teaches the next generation of scraper to skip it.
 *
 * ## The part that matters
 *
 * A filled honeypot gets the route's **normal success response**, and nothing
 * is written. Answering 400 would tell the operator their bot had been spotted
 * and exactly which request did it, so they would adapt within a day. Silence
 * that looks like success is what makes this worth having.
 *
 * ## What this is not
 *
 * Not a substitute for the rate limiter, and not effective against anyone who
 * has looked at this specific site's markup. It is a cheap filter for
 * indiscriminate spam, layered under controls that do not depend on the
 * attacker's ignorance.
 */
export const HONEYPOT_FIELD = "website";

/**
 * Optional and unconstrained on purpose.
 *
 * Rejecting a non-empty value at the schema level would produce a 400, which
 * is the signal we are trying not to send. It is accepted, then quietly
 * ignored — see `isLikelyBot`.
 */
export const honeypotField = { [HONEYPOT_FIELD]: z.string().max(200).optional() } as const;

/** True when the invisible field came back filled. */
export function isLikelyBot(input: Record<string, unknown>): boolean {
  const value = input[HONEYPOT_FIELD];
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Remove the trap field before the data goes anywhere near a service.
 *
 * Not cosmetic. The services spread their input straight into a Prisma
 * `create`, so an extra key is not ignored — Prisma rejects the whole call
 * with "Unknown argument `website`". Adding the field to the schema without
 * this broke every legitimate submission on the three busiest forms on the
 * site, which a test caught only because it asserted a real row was written.
 *
 * Stripping at the route means no feature or service has to know this field
 * exists, and none of them can accidentally persist it later.
 */
export function stripHoneypot<T extends Record<string, unknown>>(
  input: T,
): Omit<T, typeof HONEYPOT_FIELD> {
  // Copy-then-delete rather than destructuring the key out: the destructured
  // form needs a binding that is never read, which is a lint warning for no
  // benefit here.
  const rest = { ...input };
  delete rest[HONEYPOT_FIELD];
  return rest;
}
