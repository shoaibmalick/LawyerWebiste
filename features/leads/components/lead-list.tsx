"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ComposePanel } from "@/features/admin-email";
import { markLeadHandledAction, type LeadActionResult } from "../api/mark-lead-handled";

/** Narrow view-model with the date preformatted — see ReviewModerationList. */
export type LeadRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  status: "NEW" | "HANDLED";
  receivedLabel: string;
  /**
   * Where the lead came from, already resolved to display names by the page.
   *
   * Names rather than slugs: the point of showing this is that whoever triages
   * the queue can route it without opening it, and "impaired-driving-defence"
   * is a worse answer to that than "Impaired Driving Defence". Null when the
   * visitor did not say, which is a legitimate and common state.
   */
  practiceAreaLabel: string | null;
  jurisdictionLabel: string | null;
};

export function LeadList({ leads, emptyMessage }: { leads: LeadRow[]; emptyMessage: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<LeadActionResult | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [composingId, setComposingId] = useState<string | null>(null);

  function markHandled(id: string) {
    setResult(null);
    setActingId(id);

    startTransition(async () => {
      setResult(await markLeadHandledAction({ leadId: id }));
      router.refresh();
      // Cleared together with the rest, in the transition's final step:
      // router.refresh() re-renders the server component but this client
      // instance survives, and a compose panel left open points at a different
      // enquirer once the rows reorder.
      setActingId(null);
      setComposingId(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="sr-only">
        {result ? (result.ok ? result.message : result.error) : ""}
      </p>
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

      {/* Here rather than in the page so the status line above survives when
          the list empties — filtering to "New" and handling the last one would
          otherwise unmount the confirmation along with the row. */}
      {leads.length === 0 && <p className="text-muted-foreground text-sm">{emptyMessage}</p>}

      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          pending={pending}
          acting={actingId === lead.id}
          composing={composingId === lead.id}
          onToggleCompose={() => setComposingId((open) => (open === lead.id ? null : lead.id))}
          onMarkHandled={() => markHandled(lead.id)}
          onSent={(outcome) => {
            setResult(outcome);
            setComposingId(null);
            router.refresh();
          }}
        />
      ))}
    </div>
  );
}

function LeadCard({
  lead,
  pending,
  acting,
  composing,
  onToggleCompose,
  onMarkHandled,
  onSent,
}: {
  lead: LeadRow;
  pending: boolean;
  acting: boolean;
  composing: boolean;
  onToggleCompose: () => void;
  onMarkHandled: () => void;
  onSent: (result: LeadActionResult) => void;
}) {
  // A fresh object every render would restart the panel's fetch in a loop.
  const subject = useMemo(() => ({ kind: "lead" as const, leadId: lead.id }), [lead.id]);

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-foreground font-medium">
            {lead.name} · {lead.email}
            {lead.phone && ` · ${lead.phone}`}
          </p>
          {(lead.practiceAreaLabel || lead.jurisdictionLabel) && (
            <p className="flex flex-wrap items-center gap-1.5">
              {lead.practiceAreaLabel && (
                <span className="border-border bg-secondary text-secondary-foreground rounded-full border px-2 py-0.5 text-xs font-medium">
                  {lead.practiceAreaLabel}
                </span>
              )}
              {lead.jurisdictionLabel && (
                <span className="border-border text-muted-foreground rounded-full border px-2 py-0.5 text-xs">
                  {lead.jurisdictionLabel}
                </span>
              )}
            </p>
          )}
          <p className="text-muted-foreground">{lead.message}</p>
          <p className="text-muted-foreground">
            {lead.receivedLabel} · {lead.status === "NEW" ? "New" : "Handled"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onToggleCompose}>
            {composing ? "Close" : "Email"}
          </Button>
          {lead.status === "NEW" && (
            <Button variant="ghost" size="sm" disabled={pending} onClick={onMarkHandled}>
              {acting ? "Marking…" : "Mark handled"}
            </Button>
          )}
        </div>
      </div>

      {composing && (
        <div className="border-border rounded-md border border-dashed p-4">
          <ComposePanel subject={subject} onSent={onSent} />
        </div>
      )}
    </div>
  );
}
