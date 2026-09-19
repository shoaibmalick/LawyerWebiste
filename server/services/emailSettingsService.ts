import type { EmailSettings } from "@/generated/prisma/client";
import type { EmailProvider } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { sealSecret } from "@/lib/secret-box";

/**
 * True for Prisma's unique-constraint error, however it surfaces.
 *
 * Checked structurally rather than with `instanceof
 * PrismaClientKnownRequestError` because the pg driver adapter can surface the
 * same failure wrapped differently — the same reason siteSettingsService does
 * not rely on the class either.
 */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * How the business sends email. Singleton row, id always 1.
 *
 * The upsert-then-retry is the same shape siteSettingsService uses and is
 * required for the same reason: Prisma's upsert does not always compile to a
 * single `INSERT … ON CONFLICT`, and when it degrades to find-then-create two
 * concurrent callers both find nothing and both insert. Losing that race is not
 * an error — the winner created exactly the row we wanted.
 *
 * This one races more readily than the theme does, because it is read on every
 * outbound email and the booking flow sends two of them side by side.
 */
async function getSettings(): Promise<EmailSettings> {
  try {
    return await prisma.emailSettings.upsert({
      where: { id: 1 },
      // Must stay empty. Anything here and every send rewrites the row the
      // owner configured.
      update: {},
      create: { id: 1 },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return prisma.emailSettings.findUniqueOrThrow({ where: { id: 1 } });
  }
}

/**
 * What the settings form is allowed to change.
 *
 * The two secrets are three-state rather than two, which is the whole reason
 * this type is spelled out: `undefined` means "the admin left the field blank,
 * keep what is stored", a string means "replace it", and the matching `clear`
 * flag means "remove it". Without the third state there is no way to take a key
 * back out once it is in — blank would always mean keep.
 */
export type EmailSettingsUpdate = {
  provider: EmailProvider;
  fromName: string | null;
  fromAddress: string | null;
  replyTo: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean;
  smtpUser: string | null;
  resendApiKey?: string;
  clearResendApiKey?: boolean;
  smtpPassword?: string;
  clearSmtpPassword?: boolean;
  updatedByEmail: string | null;
};

/**
 * Resolves one three-state secret field into what Prisma should be told.
 *
 * Returns `{}` — not `{ field: undefined }` — for the keep case, so the column
 * is absent from the update rather than present-and-undefined. Prisma treats
 * those the same today; spelling it out means a future `strictUndefinedChecks`
 * cannot turn "keep the API key" into "erase the API key".
 */
function secretUpdate(
  value: string | undefined,
  clear: boolean | undefined,
): { set: string | null } | undefined {
  if (clear) return { set: null };
  if (value === undefined || value === "") return undefined;
  return { set: sealSecret(value) };
}

async function saveSettings(input: EmailSettingsUpdate): Promise<EmailSettings> {
  const resend = secretUpdate(input.resendApiKey, input.clearResendApiKey);
  const smtpPassword = secretUpdate(input.smtpPassword, input.clearSmtpPassword);

  // Columns named one by one rather than spreading `input`: the same
  // mass-assignment rule leadService::createLead states, and here it also keeps
  // the `clear*` flags — which are form controls, not columns — out of the
  // write entirely.
  const data = {
    provider: input.provider,
    fromName: input.fromName,
    fromAddress: input.fromAddress,
    replyTo: input.replyTo,
    smtpHost: input.smtpHost,
    smtpPort: input.smtpPort,
    smtpSecure: input.smtpSecure,
    smtpUser: input.smtpUser,
    updatedByEmail: input.updatedByEmail,
    ...(resend ? { resendApiKey: resend.set } : {}),
    ...(smtpPassword ? { smtpPassword: smtpPassword.set } : {}),
  };

  try {
    return await prisma.emailSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Someone else created the row between our find and our insert; the values
    // we were asked to store still have to win.
    return prisma.emailSettings.update({ where: { id: 1 }, data });
  }
}

export const emailSettingsService = {
  getSettings,
  saveSettings,
};
