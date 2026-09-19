import type { EmailSettings } from "@/generated/prisma/client";
import type { EmailTransportConfig } from "@/lib/email";
import { openSecret } from "@/lib/secret-box";
import { emailSettingsService } from "@/server/services/emailSettingsService";

/**
 * Turns the business's stored email settings into a transport configuration.
 *
 * ## The one lib → server/services import in the repo
 *
 * Deliberate, and given its own file rather than folded into `lib/email.ts` so
 * that file stays a database-free unit test with exactly one seam to mock.
 * Everything about "what did the owner configure" lives here; everything about
 * "how do we send" lives there.
 *
 * ## It never throws
 *
 * Every failure resolves to the environment configuration, or to NONE. Email is
 * not the page the visitor is looking at, and a settings table that is
 * unreachable — mid-migration, mid-incident — must not take down a booking
 * confirmation. This is the same fail-soft-to-a-default shape
 * `features/site-settings/api/get-active-theme.ts` uses for the palette.
 */

/** Whether a stored credential could be read. Surfaced in the settings page. */
export type EmailConfigDiagnosis = {
  config: EmailTransportConfig;
  /**
   * False when the row names a provider whose secret would not decrypt — in
   * business, AUTH_SECRET was rotated. The send still happens, via the
   * environment, but the owner is told their saved credentials are unreadable
   * rather than left wondering why their settings appear to be ignored.
   */
  secretsReadable: boolean;
};

/**
 * What the environment says. The behaviour every deployment had before
 * EmailSettings existed, and the fallback for every failure below.
 */
function fromEnvironment(): EmailTransportConfig {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { provider: "NONE" };
  return { provider: "RESEND", apiKey, from };
}

/**
 * `Practice <hello@business.test>`, or the bare address when no name is set.
 *
 * The display name is stripped of the characters that could end it early and
 * start a second header. It is never quoted-escaped, only cleaned: an owner
 * typing a double quote into their business name gets it replaced, which is
 * visible and harmless, rather than an encoding nobody can review.
 *
 * Replaced with a space and then collapsed, rather than deleted, for the same
 * reason `sanitiseSubject` does it that way: removing a newline outright welds
 * the words either side of it into one, so what a reviewer sees in the header
 * no longer resembles what was typed.
 */
function composeFrom(settings: EmailSettings): string | null {
  const address = settings.fromAddress?.trim();
  if (!address) return null;

  const name = settings.fromName
    ?.replace(/[\r\n"<>,;\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return name ? `${name} <${address}>` : address;
}

function diagnose(settings: EmailSettings): EmailConfigDiagnosis {
  if (settings.provider === "SERVER") {
    return { config: fromEnvironment(), secretsReadable: true };
  }

  const from = composeFrom(settings);
  const replyTo = settings.replyTo?.trim() || undefined;

  if (settings.provider === "RESEND") {
    const apiKey = openSecret(settings.resendApiKey);
    if (!apiKey) {
      console.error(
        "[email] the saved Resend key could not be decrypted — AUTH_SECRET may have been rotated; falling back to the environment",
      );
      return { config: fromEnvironment(), secretsReadable: false };
    }
    if (!from) {
      console.error("[email] Resend is selected but no from address is saved");
      return { config: fromEnvironment(), secretsReadable: true };
    }
    return { config: { provider: "RESEND", apiKey, from, replyTo }, secretsReadable: true };
  }

  if (!settings.smtpHost || !settings.smtpPort || !from) {
    console.error("[email] SMTP is selected but the host, port or from address is missing");
    return { config: fromEnvironment(), secretsReadable: true };
  }

  // A password is only *required* when a username is set — a local relay like
  // Mailpit, and some internal hosts, accept unauthenticated mail.
  //
  // But it is decrypted whenever one is stored, needed or not. Gating the
  // attempt on the username meant a password that would not open went
  // unreported for a host with no username, so the settings page said
  // everything was fine while holding a credential it could not read. Whether
  // a secret is readable is a fact about the secret, not about whether this
  // particular send happens to want it.
  const password = openSecret(settings.smtpPassword);
  const passwordUnreadable = settings.smtpPassword !== null && password === null;

  if (passwordUnreadable) {
    console.error(
      "[email] the saved SMTP password could not be decrypted — AUTH_SECRET may have been rotated; falling back to the environment",
    );
    return { config: fromEnvironment(), secretsReadable: false };
  }

  return {
    config: {
      provider: "SMTP",
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      user: settings.smtpUser ?? undefined,
      password: password ?? undefined,
      from,
      replyTo,
    },
    secretsReadable: true,
  };
}

/** The full picture, for the settings page, which reports on it. */
export async function diagnoseEmailConfig(): Promise<EmailConfigDiagnosis> {
  try {
    return diagnose(await emailSettingsService.getSettings());
  } catch (error) {
    console.error("[email] could not read the email settings; using the environment", error);
    return { config: fromEnvironment(), secretsReadable: true };
  }
}

/** Just the transport, for `sendEmail`. */
export async function resolveEmailConfig(): Promise<EmailTransportConfig> {
  return (await diagnoseEmailConfig()).config;
}

/** Human-readable, for the "sent via …" confirmation. Never includes a secret. */
export function describeTransport(config: EmailTransportConfig): string {
  if (config.provider === "NONE") return "no transport configured";
  if (config.provider === "RESEND") return `Resend as ${config.from}`;
  return `SMTP (${config.host}:${config.port}) as ${config.from}`;
}
