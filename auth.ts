import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { z } from "zod";
import { verifyCaptcha } from "@/lib/captcha";
import { clientIp } from "@/lib/client-ip";
import { isFeatureEnabled } from "@/lib/features";
import { checkLoginThrottle, clearLoginFailures, recordLoginFailure } from "@/lib/login-throttle";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  // Normalised so `Admin@practice.test` and `admin@practice.test` are the same
  // login. The lookup below hits a case-sensitive unique index, so without this
  // the capitalisation a user's browser autofilled decides whether they can get
  // in. Matches what createBookingSchema already does.
  email: z
    .email()
    .transform((value) => value.toLowerCase())
    .pipe(z.email()),
  password: z.string().min(1),
});

/**
 * A real bcrypt hash, of 32 random bytes that were never recorded, compared
 * against when the email does not exist.
 *
 * Measured on this machine: comparing against a valid hash takes ~142ms;
 * comparing against a malformed string takes 0ms, because bcrypt rejects the
 * format before doing any work. That gap is the whole vulnerability — the
 * login form was answering "does this person have an account here?" to anyone
 * with a stopwatch. So this must be a *genuine* hash; `?? ""` would reproduce
 * the bug it is meant to fix.
 *
 * Cost 10 matches BCRYPT_COST, so the timings stay matched if that changes.
 */
const DUMMY_HASH = "$2b$10$zdq13sE9LUHBj6Gyc6rFi.iuYUA9o8aDGbSjm3kb/jUpxqtVUMv/q";

/**
 * Where the sign-in attempt came from, for throttling.
 *
 * `headers()` needs a request scope. Auth.js calls `authorize` inside the route
 * handler, so it is available — but if that ever stops being true this must
 * degrade rather than throw, because an exception here would take the login
 * page down entirely. Falling back to a shared bucket keeps the throttle on
 * (everyone unidentifiable shares one), which is the safe direction.
 */
async function loginSource(): Promise<string> {
  try {
    return `login:${clientIp(await headers())}`;
  } catch {
    return "login:no-request-scope";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "admin",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captchaToken: { label: "Captcha token", type: "hidden" },
        captchaAnswer: { label: "Digits shown", type: "text" },
      },
      authorize: async (rawCredentials) => {
        // Throttling and the captcha both live here rather than in
        // app/login/actions.ts because this is the only point both routes into
        // a session pass through. The server action was never the whole story:
        // Auth.js also exposes POST /api/auth/callback/admin, proxy.ts does not
        // match /api/*, and that path was completely unlimited. A captcha
        // checked only on the login page would be skipped by any bot that
        // posts here directly — which is every bot worth defending against.
        const source = await loginSource();
        const throttle = checkLoginThrottle(source);
        if (throttle.throttled) {
          return null;
        }

        // Checked before the password, and before the database is touched, so
        // an unsolved challenge costs an attacker a round trip and gains them
        // nothing — not a bcrypt comparison, not a user lookup, not a timing
        // signal. This call is the one that *spends* the nonce, so a solved
        // challenge buys exactly one attempt.
        const captcha = verifyCaptcha(
          typeof rawCredentials?.captchaToken === "string" ? rawCredentials.captchaToken : null,
          typeof rawCredentials?.captchaAnswer === "string" ? rawCredentials.captchaAnswer : null,
        );
        if (captcha !== "ok") {
          recordLoginFailure(source);
          return null;
        }

        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          recordLoginFailure(source);
          return null;
        }

        const adminUser = await prisma.adminUser.findUnique({
          where: { email: parsed.data.email },
        });

        // Compare against a dummy hash when there is no such user, so a missing
        // account costs the same as a wrong password. `?? ""` would not do —
        // bcrypt rejects a malformed hash immediately, which is the very timing
        // difference this is closing.
        const isValidPassword = await bcrypt.compare(
          parsed.data.password,
          adminUser?.passwordHash ?? DUMMY_HASH,
        );

        if (!adminUser || !isValidPassword) {
          recordLoginFailure(source);
          return null;
        }

        clearLoginFailures(source);
        return { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: "admin" };
      },
    }),
    // Separate credential space from AdminUser — see CLAUDE.md's Auth.js v5
    // note and prisma/schema.prisma's Customer model comment.
    Credentials({
      id: "customer",
      name: "Customer",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (rawCredentials) => {
        if (!isFeatureEnabled("customerAccounts")) {
          return null;
        }

        // Same throttle, same key as the admin provider on purpose: an attacker
        // gets one budget per source, not one per provider they can name.
        const source = await loginSource();
        const throttle = checkLoginThrottle(source);
        if (throttle.throttled) {
          return null;
        }

        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          recordLoginFailure(source);
          return null;
        }

        const customer = await prisma.customer.findUnique({
          where: { email: parsed.data.email },
        });

        // See the admin provider above for why this compares unconditionally.
        const isValidPassword = await bcrypt.compare(
          parsed.data.password,
          customer?.passwordHash ?? DUMMY_HASH,
        );

        if (!customer || !isValidPassword) {
          recordLoginFailure(source);
          return null;
        }

        clearLoginFailures(source);
        return { id: customer.id, email: customer.email, name: customer.name, role: "customer" };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // `user.role` is set by both authorize() callbacks above.
        token.role = (user as { role: "admin" | "customer" }).role;
      }
      return token;
    },
    session({ session, token }) {
      // Cast is safe: token.role is only ever set (in the jwt callback above)
      // to "admin" or "customer" — TS's inferred type for token.role here
      // doesn't reflect our next-auth/jwt module augmentation precisely.
      const role = token.role as ("admin" | "customer") | undefined;
      if (role) {
        session.user.role = role;
      }
      return session;
    },
  },
});
