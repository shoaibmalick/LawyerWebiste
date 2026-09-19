/**
 * Decides whether `prisma/seed.ts` should create an admin user.
 *
 * Extracted from the seed script so it can be tested: importing `seed.ts`
 * executes it, and it opens by deleting every booking and availability slot.
 *
 * The rule is deliberately unforgiving — both values must be present and
 * non-empty, and there is no default of any kind. Security finding H4 was a
 * pre-filled `admin@example.com` / `changeme123` in `.env.example`; anyone who
 * copied that file and filled in the blanks deployed a live admin account on a
 * published password. `.env.example` now ships both blank, which means the
 * common case arrives here as empty strings rather than `undefined`.
 *
 * A real client's admin is set directly in that client's database during
 * onboarding — see CLAUDE.md's New-Client Onboarding Checklist — never here.
 */
export function resolveSeedAdmin(env: { email?: string; password?: string }): {
  email: string;
  password: string;
} | null {
  // Email is trimmed because a stray space in a `.env` line is a typo, not an
  // address. The password deliberately is not: whitespace is legitimate in a
  // password, and silently altering one would seed a credential nobody holds.
  const email = env.email?.trim();
  const password = env.password;

  if (!email || !password) return null;

  return { email, password };
}
