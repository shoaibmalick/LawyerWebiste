/**
 * Whether `prisma/seed.ts` is allowed to run, and on what terms.
 *
 * The seed opens by deleting every booking and every availability slot, and it
 * overwrites the admin password hash. Run against a live practice it destroys
 * the appointment book and locks reception out in the same breath.
 *
 * Extracted from the script so it can be tested. A destructive control with no
 * test is the thing this whole exercise exists to remove.
 *
 * ## Why NODE_ENV alone was not enough
 *
 * The previous guard refused when `NODE_ENV === "production"` unless
 * `ALLOW_DESTRUCTIVE_SEED=1`. Two ways that fails: `NODE_ENV` is frequently
 * unset when running a one-off script against a production connection string,
 * and `ALLOW_DESTRUCTIVE_SEED=1` is exactly the kind of variable someone sets
 * once, exports in a shell, and forgets.
 *
 * So the question asked here is not "which environment do you claim to be in"
 * but "which database are you actually pointed at". That is the fact that
 * matters and the one the connection string cannot lie about.
 */

export type SeedDecision =
  /** Safe: a local database, no production markers. Proceed, but say so. */
  | { verdict: "allow"; message: string }
  /** Dangerous but permitted, and a human is present to confirm it. */
  | { verdict: "confirm"; message: string }
  /** Refuse outright. */
  | { verdict: "refuse"; message: string };

export type SeedContext = {
  nodeEnv: string | undefined;
  databaseUrl: string | undefined;
  allowDestructive: string | undefined;
  /** True when stdin is a terminal, i.e. a person is watching. */
  isTty: boolean;
};

/**
 * Hosts that cannot be a production database.
 *
 * An allowlist rather than a denylist: the failure mode of a missed entry is a
 * refusal a developer can override, whereas the failure mode of a missed
 * denylist entry is a wiped practice.
 */
const NON_PROD_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "0.0.0.0",
  "host.docker.internal",
]);

/** The host of a connection string, or null if it cannot be determined. */
export function databaseHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * A host is treated as non-production only if we can positively identify it as
 * local. An unparseable or unfamiliar connection string is treated as
 * production — the safe direction when the answer is unknown.
 */
export function isNonProductionHost(url: string | undefined): boolean {
  const host = databaseHost(url);
  if (host === null) return false;
  return NON_PROD_HOSTS.has(host) || host.endsWith(".local");
}

export function assessSeed(context: SeedContext): SeedDecision {
  const host = databaseHost(context.databaseUrl) ?? "<unparseable>";
  const local = isNonProductionHost(context.databaseUrl);
  const claimsProduction = context.nodeEnv === "production";
  const overridden = context.allowDestructive === "1";

  // The ordinary case: a local database and no production claim.
  if (local && !claimsProduction) {
    return {
      verdict: "allow",
      message: `Seeding ${host} — deleting all bookings and availability slots.`,
    };
  }

  const why = !local
    ? `DATABASE_URL points at "${host}", which is not a recognised local host`
    : `NODE_ENV=production`;

  if (!overridden) {
    return {
      verdict: "refuse",
      message: [
        `Refusing to seed: ${why}.`,
        "",
        "This deletes every booking and availability slot and resets the admin",
        "password. If this really is a new client database with nothing to lose,",
        "re-run with ALLOW_DESTRUCTIVE_SEED=1.",
      ].join("\n"),
    };
  }

  // Overridden. If a person is at the keyboard, make them say it out loud —
  // an exported shell variable should not be enough on its own.
  if (context.isTty) {
    return {
      verdict: "confirm",
      message: [
        `About to DESTROY ALL BOOKINGS on "${host}".`,
        `(${why}; ALLOW_DESTRUCTIVE_SEED=1 is set.)`,
        "",
        `Type the host name to confirm: `,
      ].join("\n"),
    };
  }

  // No terminal — a CI job or a script. The override alone has to carry it,
  // so the log is the only record that this happened.
  return {
    verdict: "allow",
    message:
      `DESTRUCTIVE SEED on "${host}" with ALLOW_DESTRUCTIVE_SEED=1 and no terminal ` +
      `to confirm at (${why}). Deleting all bookings and availability slots.`,
  };
}

/** What the operator must type at the confirmation prompt. */
export function expectedConfirmation(databaseUrl: string | undefined): string {
  return databaseHost(databaseUrl) ?? "<unparseable>";
}
