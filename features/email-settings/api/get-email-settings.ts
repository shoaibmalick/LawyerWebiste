import type { EmailProvider } from "@/generated/prisma/enums";
import { describeTransport, diagnoseEmailConfig } from "@/lib/email-config";
import { emailSettingsService } from "@/server/services/emailSettingsService";

/**
 * What the settings page renders.
 *
 * A plain read module, not `"use server"` — the same shape
 * `features/site-settings/api/get-active-theme.ts` has. It is called by a
 * Server Component that has already run `requireAdmin`, and being a module
 * rather than an action means it is not an RPC endpoint in its own right.
 */

/**
 * Deliberately narrower than the row.
 *
 * The two secrets are booleans here and nowhere else. This object crosses into
 * a client component, and a shape that carries ciphertext into a browser
 * payload is one refactor away from carrying the plaintext.
 */
export type EmailSettingsView = {
  provider: EmailProvider;
  fromName: string;
  fromAddress: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  hasResendApiKey: boolean;
  hasSmtpPassword: boolean;
  /**
   * False when a saved credential will not decrypt — in business AUTH_SECRET
   * was rotated. The page says so, because the alternative is an owner staring
   * at settings that look right and are being ignored.
   */
  secretsReadable: boolean;
  /** Whether anything can actually send right now, stored or from the environment. */
  canSend: boolean;
  /** "SMTP (smtp.office365.test:587) as hello@…" — never includes a secret. */
  activeTransport: string;
  updatedByEmail: string | null;
};

export async function getEmailSettings(): Promise<EmailSettingsView> {
  const [settings, diagnosis] = await Promise.all([
    emailSettingsService.getSettings(),
    diagnoseEmailConfig(),
  ]);

  return {
    provider: settings.provider,
    fromName: settings.fromName ?? "",
    fromAddress: settings.fromAddress ?? "",
    replyTo: settings.replyTo ?? "",
    smtpHost: settings.smtpHost ?? "",
    // A string because it populates a text input; an empty one has to mean
    // "nothing entered" rather than the number zero.
    smtpPort: settings.smtpPort === null ? "" : String(settings.smtpPort),
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser ?? "",
    hasResendApiKey: settings.resendApiKey !== null,
    hasSmtpPassword: settings.smtpPassword !== null,
    secretsReadable: diagnosis.secretsReadable,
    canSend: diagnosis.config.provider !== "NONE",
    activeTransport: describeTransport(diagnosis.config),
    updatedByEmail: settings.updatedByEmail,
  };
}
