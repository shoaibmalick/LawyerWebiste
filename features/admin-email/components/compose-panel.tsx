"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/field";
import {
  getComposeContextAction,
  type ComposeContext,
  type ComposeContextResult,
} from "../api/get-compose-context";
import { sendAdminEmailAction, type SendEmailResult } from "../api/send-admin-email";
import type { EmailSubject } from "../schema/send-email.schema";

/**
 * Compose and send, shared by the Bookings and Messages lists.
 *
 * The context — recipient, pre-filled templates, what has already been sent —
 * is fetched when the panel opens rather than with the list, for the same
 * reason the call panel does it: a hundred rows would be a hundred round trips
 * for information nobody has asked to see.
 */
export function ComposePanel({
  subject,
  onSent,
}: {
  subject: EmailSubject;
  /** Called after a send so the list can refresh and close this panel. */
  onSent: (result: SendEmailResult) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [context, setContext] = useState<ComposeContext | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [result, setResult] = useState<SendEmailResult | null>(null);

  const [templateKey, setTemplateKey] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [body, setBody] = useState("");

  // The subject is a new object identity on every render of the parent, so the
  // dependency is its contents rather than the object itself — otherwise this
  // refetches in a loop.
  const subjectId = subject.kind === "booking" ? subject.bookingId : subject.leadId;

  useEffect(() => {
    let cancelled = false;

    getComposeContextAction({ subject })
      .then((outcome: ComposeContextResult) => {
        if (cancelled) return;
        if (outcome.ok) setContext(outcome.context);
        else setLoadError(outcome.error);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load this record. Refresh and try again.");
      });

    // The panel can be closed while the request is in flight; without this the
    // response would set state on a component nobody is looking at.
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject.kind, subjectId]);

  function applyTemplate(key: string) {
    setTemplateKey(key);
    const template = context?.templates.find((candidate) => candidate.key === key);
    if (!template) return;
    // Overwrites whatever is typed, deliberately: picking a template is an
    // explicit "start again from this".
    setSubjectLine(template.subject);
    setBody(template.body);
  }

  function onSend() {
    setResult(null);
    startTransition(async () => {
      const outcome = await sendAdminEmailAction({
        subject,
        templateKey: templateKey || undefined,
        subjectLine,
        body,
      });
      setResult(outcome);
      if (outcome.ok) onSent(outcome);
    });
  }

  if (loadError) {
    return <p className="text-destructive text-sm">{loadError}</p>;
  }

  if (!context) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-foreground font-medium">Email {context.recipientName}</h3>
        <p className="text-muted-foreground text-sm">
          Goes to {context.recipientEmail} — the address on this record. You can&apos;t send it
          anywhere else from here.
        </p>
      </div>

      {!context.canSend && (
        <p className="text-destructive text-sm">
          Email isn&apos;t set up yet, so this won&apos;t actually send. It will still be recorded
          below. Set it up in Settings.
        </p>
      )}

      {context.templates.length > 0 && (
        <label className="flex max-w-md flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Start from</span>
          <select
            value={templateKey}
            onChange={(event) => applyTemplate(event.target.value)}
            className={FIELD}
          >
            <option value="">Write it myself</option>
            {context.templates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground font-medium">Subject</span>
        <input
          value={subjectLine}
          onChange={(event) => setSubjectLine(event.target.value)}
          placeholder="About your appointment"
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground font-medium">Message</span>
        {/* resize-y, not the browser default of `both`: this panel sits inside
            a list row inside the page's padding, so a sideways drag pushes the
            textarea past its container and takes the whole page into
            horizontal scroll. Vertical resizing is the useful half anyway. */}
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={10}
          placeholder={`Hi ${context.recipientName},`}
          className={`${FIELD} resize-y`}
        />
        <span className="text-muted-foreground">
          Plain text. A blank line starts a new paragraph. Links and formatting are sent as you type
          them, not as HTML.
        </span>
      </label>

      <p aria-live="polite" className="sr-only">
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          onClick={onSend}
          disabled={pending || !subjectLine.trim() || !body.trim()}
        >
          {pending ? "Sending…" : "Send"}
        </Button>
        {result && (
          <p
            aria-hidden="true"
            className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}
          >
            {result.ok ? result.message : result.error}
          </p>
        )}
      </div>

      <section className="flex flex-col gap-2">
        <h4 className="text-foreground text-sm font-medium">Emails already sent</h4>
        {context.history.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing yet.</p>
        ) : (
          <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
            {context.history.map((message) => (
              <li key={message.id}>
                <span className="text-foreground">{message.subject}</span>
                <br />
                {message.whenLabel} · {message.sender} · {message.statusLabel}
                {message.error ? ` — ${message.error}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
