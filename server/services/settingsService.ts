import { prisma } from "@/lib/prisma";
import { sealSecret } from "@/lib/secret-box";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

// Singleton row (id always 1) — see schema.prisma's PaymentSettings comment
// for why this is DB-backed and admin-editable rather than agency config.
//
// The retry mirrors siteSettingsService: Prisma's upsert does not always
// compile to a single `INSERT … ON CONFLICT`, so two concurrent callers can
// both find no row and both insert. This surfaced for real on SiteSettings,
// where two parallel reads happen on every page load; PaymentSettings is read
// on the booking path, which is lower-concurrency but not single-threaded.
// Losing the race is not an error — the winner created the row we wanted.
async function getPaymentSettings() {
  try {
    return await prisma.paymentSettings.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return prisma.paymentSettings.findUniqueOrThrow({ where: { id: 1 } });
  }
}

async function setPaymentTiming(timing: "UPFRONT" | "AFTER_SERVICE") {
  try {
    return await prisma.paymentSettings.upsert({
      where: { id: 1 },
      update: { timing },
      create: { id: 1, timing },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    return prisma.paymentSettings.update({ where: { id: 1 }, data: { timing } });
  }
}

export type StripeCredentialsUpdate = {
  stripeSecretKey?: string;
  clearStripeSecretKey?: boolean;
  stripeWebhookSecret?: string;
  clearStripeWebhookSecret?: boolean;
  stripePublishableKey?: string | null;
  updatedByEmail?: string | null;
};

/**
 * Resolves one three-state secret field into what Prisma should be told.
 *
 * Blank means keep, an explicit clear means erase, anything else means replace.
 * Without that third state there is no way to take a key back out — an empty
 * input box is indistinguishable from "I did not retype it".
 *
 * Returns `{}` rather than `{ field: undefined }` for the keep case, so the
 * column is absent from the update rather than present-and-undefined. Prisma
 * treats those alike today; spelling it out means a future
 * `strictUndefinedChecks` cannot turn "keep the key" into "erase the key".
 * Lifted from emailSettingsService, which had the same problem first.
 */
function secretUpdate(
  value: string | undefined,
  clear: boolean | undefined,
): { set: string | null } | undefined {
  if (clear) return { set: null };
  if (value === undefined || value === "") return undefined;
  return { set: sealSecret(value) };
}

async function saveStripeCredentials(input: StripeCredentialsUpdate) {
  const secret = secretUpdate(input.stripeSecretKey, input.clearStripeSecretKey);
  const webhook = secretUpdate(input.stripeWebhookSecret, input.clearStripeWebhookSecret);

  // Columns named one by one rather than spreading `input` — the same
  // mass-assignment rule leadService::createLead states. Here it also keeps
  // the `clear*` flags, which are form controls rather than columns, out of
  // the write entirely, and makes it impossible for a malformed payload to
  // reach `timing` and change when money is taken.
  const data = {
    ...(input.stripePublishableKey !== undefined
      ? { stripePublishableKey: input.stripePublishableKey || null }
      : {}),
    ...(input.updatedByEmail !== undefined ? { updatedByEmail: input.updatedByEmail } : {}),
    ...(secret ? { stripeSecretKey: secret.set } : {}),
    ...(webhook ? { stripeWebhookSecret: webhook.set } : {}),
  };

  try {
    return await prisma.paymentSettings.upsert({
      where: { id: 1 },
      update: data,
      create: { id: 1, ...data },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Someone else created the row between our find and our insert; the values
    // we were asked to store still have to win.
    return prisma.paymentSettings.update({ where: { id: 1 }, data });
  }
}

export const settingsService = {
  getPaymentSettings,
  setPaymentTiming,
  saveStripeCredentials,
};
