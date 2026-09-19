"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { BookingActionResult } from "../api/confirm-booking";
import { setFollowUpWindowAction } from "../api/follow-up-window";

/**
 * How far ahead the Bookings page's follow-up view looks.
 *
 * A client component with a real status line rather than the plain inline
 * server-action form the payments block uses — a settings save that gives no
 * feedback is exactly the dead-button problem CLAUDE.md's admin-list note is
 * about.
 */
export function FollowUpWindowForm({ days }: { days: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<BookingActionResult | null>(null);
  const [value, setValue] = useState(days);

  function save() {
    setResult(null);
    startTransition(async () => {
      const outcome = await setFollowUpWindowAction({ days: value });
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  }

  return (
    <section className="border-border flex flex-col gap-5 rounded-lg border p-5">
      <div>
        <h2 className="text-foreground text-lg font-medium">Follow-up window</h2>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          How far ahead the Bookings page&apos;s follow-up view looks. Appointments nobody has
          confirmed yet are listed first, so they can be called before the day arrives.
        </p>
      </div>

      <label className="flex flex-wrap items-end gap-3 text-sm">
        <span className="text-foreground font-medium">Look ahead</span>
        <input
          type="number"
          min={1}
          max={60}
          value={value}
          onChange={(event) => setValue(Math.max(1, Math.min(60, Number(event.target.value) || 1)))}
          className="border-border w-24 rounded-md border px-3 py-2"
        />
        <span className="text-muted-foreground">days</span>
      </label>

      <div className="flex items-center gap-4">
        <Button size="sm" disabled={pending || value === days} onClick={save}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {result && (
          <p className={result.ok ? "text-foreground text-sm" : "text-destructive text-sm"}>
            {result.ok ? result.message : result.error}
          </p>
        )}
      </div>
    </section>
  );
}
