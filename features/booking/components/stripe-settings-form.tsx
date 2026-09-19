"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StripeConfigDiagnosis } from "@/lib/stripe-config";
import { FIELD } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  saveStripeCredentialsAction,
  type StripeCredentialsActionResult,
} from "../api/save-stripe-credentials";

/**
 * Connects the business's own Stripe account, without a redeploy.
 *
 * Three things here are load-bearing rather than cosmetic.
 *
 * **No secret ever reaches this component.** It receives a diagnosis — a set
 * of booleans, the publishable key, and which mode the account is in. Not the
 * ciphertext, not a masked prefix of the plaintext. A masked prefix looks
 * harmless and leaks the live/test distinction plus the account, so it is not
 * offered either.
 *
 * **Blank means keep.** Typing nothing leaves the stored key alone, which is
 * what an admin editing the publishable key expects. Erasing a key needs the
 * explicit Clear checkbox, because without that third state there is no way to
 * take one back out at all.
 *
 * **Test versus live is stated in words.** A business that believes it has
 * been taking real payments for a week and has not is the expensive version of
 * this mistake, and the key prefix already knows the answer.
 */
export function StripeSettingsForm({ config }: { config: StripeConfigDiagnosis }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StripeCredentialsActionResult | null>(null);

  const [secretKey, setSecretKey] = useState("");
  const [clearSecretKey, setClearSecretKey] = useState(false);
  const [webhookSecret, setWebhookSecret] = useState("");
  const [clearWebhookSecret, setClearWebhookSecret] = useState(false);
  const [publishableKey, setPublishableKey] = useState(config.publishableKey ?? "");

  function onSave() {
    setResult(null);
    startTransition(async () => {
      const outcome = await saveStripeCredentialsAction({
        stripeSecretKey: secretKey,
        clearStripeSecretKey: clearSecretKey,
        stripeWebhookSecret: webhookSecret,
        clearStripeWebhookSecret: clearWebhookSecret,
        stripePublishableKey: publishableKey,
      });
      setResult(outcome);

      if (outcome.ok) {
        // Clear the secret inputs so a typed key does not sit in the DOM after
        // it has been stored, and re-fetch so the badges below reflect what is
        // actually saved rather than what was just typed.
        setSecretKey("");
        setWebhookSecret("");
        setClearSecretKey(false);
        setClearWebhookSecret(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-foreground font-medium">Stripe account</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect your own Stripe account. Leave a field blank to keep what is already saved.
        </p>
      </div>

      <StripeStatus config={config} />

      <div className="flex max-w-md flex-col gap-4">
        <SecretField
          id="stripe-secret-key"
          label="Secret key"
          hint="Starts sk_test_ or sk_live_. Stored encrypted and never shown again."
          value={secretKey}
          onChange={setSecretKey}
          exists={config.hasSecretKey}
          clear={clearSecretKey}
          onClear={setClearSecretKey}
          disabled={pending}
        />

        <SecretField
          id="stripe-webhook-secret"
          label="Webhook signing secret"
          hint="Starts whsec_. Stripe shows this once, when you create the endpoint."
          value={webhookSecret}
          onChange={setWebhookSecret}
          exists={config.hasWebhookSecret}
          clear={clearWebhookSecret}
          onClear={setClearWebhookSecret}
          disabled={pending}
        />

        <div className="flex flex-col gap-1">
          <label className="flex flex-col gap-1 text-sm" htmlFor="stripe-publishable-key">
            <span className="text-foreground font-medium">Publishable key</span>
          </label>
          <input
            id="stripe-publishable-key"
            className={FIELD}
            value={publishableKey}
            onChange={(event) => setPublishableKey(event.target.value)}
            disabled={pending}
            placeholder="pk_test_…"
          />
          <p className="text-muted-foreground text-xs">
            Not a secret — this one is sent to browsers by design, so it is shown back here.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save payment settings"}
        </Button>
        {result && (
          <p className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}>
            {result.ok ? result.message : result.error}
          </p>
        )}
      </div>
    </div>
  );
}

function StripeStatus({ config }: { config: StripeConfigDiagnosis }) {
  if (!config.hasSecretKey) {
    return (
      <p className="text-muted-foreground text-sm">
        No Stripe account is connected. Bookings that require a deposit will be refused until one is
        — they are not taken for free.
      </p>
    );
  }

  return (
    <div className="text-sm">
      <p className="text-foreground">
        {config.mode === "live" ? (
          <>
            Connected in <strong>live mode</strong> — real cards will be charged.
          </>
        ) : config.mode === "test" ? (
          <>
            Connected in <strong>test mode</strong> — no real money moves.
          </>
        ) : (
          <>Connected.</>
        )}{" "}
        {config.source === "environment" && (
          <span className="text-muted-foreground">
            Using the keys set when this site was deployed, not ones saved here.
          </span>
        )}
      </p>
      {!config.hasWebhookSecret && (
        <p className="text-destructive mt-1">
          No webhook signing secret. Payments will be taken but bookings will not be confirmed
          automatically.
        </p>
      )}
      {!config.secretsReadable && (
        <p className="text-destructive mt-1">
          A saved credential could not be decrypted. This normally means AUTH_SECRET was changed —
          re-enter the keys below.
        </p>
      )}
    </div>
  );
}

function SecretField({
  id,
  label,
  hint,
  value,
  onChange,
  exists,
  clear,
  onClear,
  disabled,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  exists: boolean;
  clear: boolean;
  onClear: (clear: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex flex-col gap-1 text-sm" htmlFor={id}>
        <span className="text-foreground font-medium">{label}</span>
      </label>
      <input
        id={id}
        type="password"
        className={FIELD}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || clear}
        placeholder={exists ? "Saved — type to replace" : "Not set"}
        autoComplete="off"
      />
      <p className="text-muted-foreground text-xs">{hint}</p>
      {exists && (
        <label className="text-muted-foreground flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={clear}
            onChange={(event) => onClear(event.target.checked)}
            disabled={disabled}
          />
          Remove the saved value
        </label>
      )}
    </div>
  );
}
