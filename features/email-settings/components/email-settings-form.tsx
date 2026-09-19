"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/field";
import type { EmailProvider } from "@/generated/prisma/enums";
import type { EmailSettingsView } from "../api/get-email-settings";
import {
  saveEmailSettingsAction,
  type EmailSettingsActionResult,
} from "../api/save-email-settings";
import { sendTestEmailAction } from "../api/send-test-email";

/** The editable fields, as strings — this is a form. */
type Draft = {
  provider: EmailProvider;
  fromName: string;
  fromAddress: string;
  replyTo: string;
  resendApiKey: string;
  clearResendApiKey: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  clearSmtpPassword: boolean;
};

function draftFrom(settings: EmailSettingsView): Draft {
  return {
    provider: settings.provider,
    fromName: settings.fromName,
    fromAddress: settings.fromAddress,
    replyTo: settings.replyTo,
    // Never populated from the server: a stored secret is not sent here at
    // all, only a boolean saying one exists.
    resendApiKey: "",
    clearResendApiKey: false,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpSecure: settings.smtpSecure,
    smtpUser: settings.smtpUser,
    smtpPassword: "",
    clearSmtpPassword: false,
  };
}

const PROVIDERS: { value: EmailProvider; label: string; hint: string }[] = [
  {
    value: "SERVER",
    label: "Use the server's configuration",
    hint: "Whatever was set up when the site was built. Nothing to fill in here.",
  },
  {
    value: "RESEND",
    label: "Resend",
    hint: "An email service built for websites. Needs an account and a verified domain, and gives the best chance of landing in an inbox rather than a spam folder.",
  },
  {
    value: "SMTP",
    label: "Your own mailbox (SMTP)",
    hint: "Send through a mailbox you already have — Google Workspace, Microsoft 365, or your host's mail server.",
  },
];

export function EmailSettingsForm({ settings }: { settings: EmailSettingsView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<EmailSettingsActionResult | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(settings));
  const [saved, setSaved] = useState<Draft>(() => draftFrom(settings));

  /**
   * The Test button acts on what is *stored*, so it must be unavailable while
   * the form says something different. A green test against values that were
   * never saved is worse than no test at all.
   */
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  function set<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function onSave() {
    setResult(null);
    startTransition(async () => {
      const outcome = await saveEmailSettingsAction({
        provider: draft.provider,
        fromName: draft.fromName,
        fromAddress: draft.fromAddress,
        replyTo: draft.replyTo,
        resendApiKey: draft.resendApiKey,
        clearResendApiKey: draft.clearResendApiKey,
        smtpHost: draft.smtpHost,
        smtpPort: draft.smtpPort === "" ? undefined : draft.smtpPort,
        smtpSecure: draft.smtpSecure,
        smtpUser: draft.smtpUser,
        smtpPassword: draft.smtpPassword,
        clearSmtpPassword: draft.clearSmtpPassword,
      });
      setResult(outcome);

      if (outcome.ok) {
        // Clear the secret fields and the clear-flags together, in the
        // transition's final step: leaving a typed key in the box after a save
        // means the next save re-submits it, and leaving a ticked Clear box
        // armed means the next save wipes a key the admin has just re-entered.
        const settled: Draft = {
          ...draft,
          resendApiKey: "",
          smtpPassword: "",
          clearResendApiKey: false,
          clearSmtpPassword: false,
        };
        setDraft(settled);
        setSaved(settled);
        router.refresh();
      }
    });
  }

  function onTest() {
    setResult(null);
    startTransition(async () => {
      setResult(await sendTestEmailAction());
      router.refresh();
    });
  }

  return (
    <section className="border-border flex flex-col gap-5 rounded-lg border p-5">
      <div>
        <h2 className="text-foreground text-lg font-medium">Email</h2>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          How the website sends email — booking confirmations, enquiry notifications, and anything
          you send a customer from the Bookings and Messages pages.
        </p>
      </div>

      {!settings.secretsReadable && (
        <p className="border-destructive text-destructive rounded-md border p-3 text-sm">
          The saved credentials can&apos;t be read. This usually means the site&apos;s security key
          was changed. Enter them again below and save.
        </p>
      )}

      <p className="text-muted-foreground text-sm">
        {settings.canSend
          ? `Sending now via ${settings.activeTransport}.`
          : "Email isn't set up yet, so nothing is being sent."}
      </p>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">How to send email</legend>
        {PROVIDERS.map((option) => (
          <label
            key={option.value}
            className="border-border flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-sm"
          >
            <input
              type="radio"
              name="email-provider"
              value={option.value}
              checked={draft.provider === option.value}
              onChange={() => set("provider", option.value)}
              className="mt-1 shrink-0"
            />
            <span>
              <span className="text-foreground block font-medium">{option.label}</span>
              <span className="text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {draft.provider !== "SERVER" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
              <span className="text-foreground font-medium">Sender name</span>
              <input
                value={draft.fromName}
                onChange={(event) => set("fromName", event.target.value)}
                placeholder="Acme Dental"
                className={FIELD}
              />
            </label>
            <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
              <span className="text-foreground font-medium">Send from</span>
              <input
                type="email"
                value={draft.fromAddress}
                onChange={(event) => set("fromAddress", event.target.value)}
                placeholder="hello@yourpractice.com"
                className={FIELD}
              />
            </label>
            <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
              <span className="text-foreground font-medium">Replies go to</span>
              <input
                type="email"
                value={draft.replyTo}
                onChange={(event) => set("replyTo", event.target.value)}
                placeholder="Optional — defaults to the send-from address"
                className={FIELD}
              />
            </label>
          </div>

          {draft.provider === "RESEND" && (
            <SecretField
              label="Resend API key"
              value={draft.resendApiKey}
              stored={settings.hasResendApiKey}
              clear={draft.clearResendApiKey}
              onChange={(value) => set("resendApiKey", value)}
              onClear={(value) => set("clearResendApiKey", value)}
            />
          )}

          {draft.provider === "SMTP" && (
            <>
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
                  <span className="text-foreground font-medium">Mail server</span>
                  <input
                    value={draft.smtpHost}
                    onChange={(event) => set("smtpHost", event.target.value)}
                    placeholder="smtp.gmail.com"
                    className={FIELD}
                  />
                </label>
                <label className="flex w-28 flex-col gap-1 text-sm">
                  <span className="text-foreground font-medium">Port</span>
                  <input
                    inputMode="numeric"
                    value={draft.smtpPort}
                    onChange={(event) => set("smtpPort", event.target.value)}
                    placeholder="465"
                    className={FIELD}
                  />
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.smtpSecure}
                    onChange={(event) => set("smtpSecure", event.target.checked)}
                  />
                  <span className="text-foreground">Use TLS</span>
                </label>
              </div>
              <p className="text-muted-foreground text-sm">
                Port 465 usually needs TLS on; port 587 usually needs it off.
              </p>

              <label className="flex max-w-md flex-col gap-1 text-sm">
                <span className="text-foreground font-medium">Username</span>
                <input
                  value={draft.smtpUser}
                  onChange={(event) => set("smtpUser", event.target.value)}
                  placeholder="Leave blank if your server doesn't need one"
                  className={FIELD}
                />
              </label>

              <SecretField
                label="Password"
                value={draft.smtpPassword}
                stored={settings.hasSmtpPassword}
                clear={draft.clearSmtpPassword}
                onChange={(value) => set("smtpPassword", value)}
                onClear={(value) => set("clearSmtpPassword", value)}
              />

              <p className="text-muted-foreground max-w-md text-sm">
                Whatever mail provider you name here will handle your customers&apos; messages.
                Choose one you&apos;re content to hold that information.
              </p>
            </>
          )}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onSave} disabled={pending || !dirty}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onTest}
          disabled={pending || dirty || !settings.canSend}
        >
          Send test email
        </Button>
        {dirty && (
          <span className="text-muted-foreground text-sm">Save your changes before testing.</span>
        )}
        {result && (
          // aria-hidden because the live region above already announces this
          // text; without it a screen reader reads the same message twice.
          <p
            aria-hidden="true"
            className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}
          >
            {result.ok ? result.message : result.error}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * A credential that is already stored is never sent back to the browser, so
 * this renders an empty box plus the fact that one exists.
 *
 * The Clear checkbox is the other half of that rule. "Blank means keep" on its
 * own leaves no way to remove a key at all — the owner switching away from a
 * provider would leave their credential in the database forever.
 */
function SecretField({
  label,
  value,
  stored,
  clear,
  onChange,
  onClear,
}: {
  label: string;
  value: string;
  stored: boolean;
  clear: boolean;
  onChange: (value: string) => void;
  onClear: (value: boolean) => void;
}) {
  return (
    <div className="flex max-w-md flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <input
          type="password"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={clear}
          autoComplete="new-password"
          placeholder={stored ? "Saved — leave blank to keep it" : "Paste it here"}
          className={FIELD}
        />
      </label>
      {stored && (
        <label className="text-muted-foreground flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={clear}
            onChange={(event) => onClear(event.target.checked)}
          />
          <span>Remove the saved {label.toLowerCase()}</span>
        </label>
      )}
    </div>
  );
}
