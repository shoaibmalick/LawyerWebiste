/**
 * bcrypt work factor, in one place.
 *
 * It was hardcoded as `10` in two files that had no reason to know about each
 * other — `features/customer-accounts/api/signup.ts` and `prisma/seed.ts`.
 * Raising one and not the other is a silent inconsistency: hashes stay valid
 * either way, so nothing fails, and half the accounts are simply cheaper to
 * crack than intended.
 *
 * 10 is roughly 140ms per hash on this machine. Raising it is a
 * backwards-compatible change — bcrypt stores the cost in the hash, so
 * existing passwords keep verifying at the cost they were written with, and
 * only new or changed ones use the new value.
 *
 * `auth.ts`'s DUMMY_HASH is generated at this cost too, so the miss path keeps
 * costing the same as the hit path.
 */
export const BCRYPT_COST = 10;
