-- Stripe credentials stored on the PaymentSettings singleton, so a business
-- connects its own Stripe account from /dashboard/settings instead of an agency
-- editing environment variables and redeploying.
--
-- Every column is nullable and lib/stripe-config.ts falls back to the
-- environment, so a deployment that never opens the settings page behaves
-- exactly as it did before this migration. Nothing here changes an existing
-- payment flow until someone saves a key.
--
-- stripeSecretKey and stripeWebhookSecret hold ciphertext from
-- lib/secret-box.ts (AES-256-GCM, key derived from AUTH_SECRET via HKDF),
-- never plaintext — the same treatment EmailSettings gives its credentials, so
-- a database dump yields no working key for the business's Stripe account.
--
-- stripePublishableKey is deliberately NOT encrypted. It is published to
-- browsers by design; encrypting it would imply a secrecy it does not have and
-- would stop the settings page showing the business which account is connected.
--
-- updatedAt is NOT NULL with a default so the existing singleton row (if one
-- has already been materialised) satisfies the constraint without a backfill.

ALTER TABLE "PaymentSettings" ADD COLUMN "stripeSecretKey" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN "stripeWebhookSecret" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN "stripePublishableKey" TEXT;
ALTER TABLE "PaymentSettings" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PaymentSettings" ADD COLUMN "updatedByEmail" TEXT;
