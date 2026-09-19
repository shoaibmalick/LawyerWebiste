"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/field";
import {
  reorderPracticeAreasAction,
  resetPracticeAreaAction,
  updatePracticeAreaAction,
  type PracticeAreaActionResult,
} from "../api/update-practice-area";

/** One editable row, flattened by the page so this component reads no config. */
export type AdminRow = {
  slug: string;
  kind: "CATEGORY" | "SERVICE";
  name: string;
  /** What config says, shown as the placeholder so "unchanged" is legible. */
  configText: string;
  configCta: string | null;
  visible: boolean;
  featured: boolean;
  summaryOverride: string | null;
  ctaOverride: string | null;
  /** Whether a row exists at all — drives the Reset control. */
  overridden: boolean;
};

export type AdminGroup = {
  audience: "business" | "individual";
  category: AdminRow;
  services: AdminRow[];
};

export function PracticeAreaAdminTable({ groups }: { groups: AdminGroup[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<PracticeAreaActionResult | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  /**
   * One helper for every mutation.
   *
   * `router.refresh()` only on success: re-rendering after a rejected save
   * would replace the form the admin is looking at with the server's unchanged
   * state, silently discarding what they typed along with the error explaining
   * why it did not save.
   */
  function run(action: () => Promise<PracticeAreaActionResult>) {
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) router.refresh();
    });
  }

  const categoryOrder = groups.map((group) => group.category.slug);

  function move(index: number, direction: -1 | 1) {
    const next = [...categoryOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    run(() => reorderPracticeAreasAction({ kind: "CATEGORY", slugs: next }));
  }

  return (
    <div className="flex flex-col gap-4">
      {result && (
        <p
          role="status"
          className={result.ok ? "text-muted-foreground text-sm" : "text-destructive text-sm"}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}

      {groups.map((group, index) => (
        <section key={group.category.slug} className="border-border rounded-lg border">
          <header className="border-border flex flex-wrap items-center gap-3 border-b p-4">
            <div className="min-w-0 flex-1">
              <p className="text-foreground font-medium">
                {group.category.name}
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  {group.audience === "business" ? "Business" : "Individuals"}
                </span>
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {group.category.summaryOverride ?? group.category.configText}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending || index === 0}
                aria-label={`Move ${group.category.name} up`}
                onClick={() => move(index, -1)}
              >
                <ChevronUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={pending || index === groups.length - 1}
                aria-label={`Move ${group.category.name} down`}
                onClick={() => move(index, 1)}
              >
                <ChevronDown />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => setOpen(open === group.category.slug ? null : group.category.slug)}
              >
                {open === group.category.slug ? "Close" : "Edit"}
              </Button>
            </div>
          </header>

          {open === group.category.slug && (
            <div className="border-border border-b p-4">
              <RowEditor row={group.category} pending={pending} run={run} />
            </div>
          )}

          <ul className="divide-border divide-y">
            {group.services.map((service) => (
              <li key={service.slug} className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground text-sm font-medium">
                      {service.name}
                      {!service.visible && (
                        <span className="text-destructive ml-2 text-xs">Hidden</span>
                      )}
                      {service.featured && (
                        <span className="text-primary ml-2 text-xs">Featured</span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {service.summaryOverride ?? service.configText}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => setOpen(open === service.slug ? null : service.slug)}
                  >
                    {open === service.slug ? "Close" : "Edit"}
                  </Button>
                </div>

                {open === service.slug && (
                  <div className="mt-4">
                    <RowEditor row={service} pending={pending} run={run} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RowEditor({
  row,
  pending,
  run,
}: {
  row: AdminRow;
  pending: boolean;
  run: (action: () => Promise<PracticeAreaActionResult>) => void;
}) {
  const [visible, setVisible] = useState(row.visible);
  const [featured, setFeatured] = useState(row.featured);
  const [summary, setSummary] = useState(row.summaryOverride ?? "");
  const [cta, setCta] = useState(row.ctaOverride ?? "");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={visible}
            onChange={(event) => setVisible(event.target.checked)}
            className="size-4"
          />
          <span className="text-foreground">Visible on the site</span>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={featured}
            onChange={(event) => setFeatured(event.target.checked)}
            className="size-4"
          />
          <span className="text-foreground">Featured</span>
        </label>
      </div>

      {!visible && (
        <p className="text-muted-foreground text-xs">
          Hiding this removes it from the site entirely &mdash; its page will return 404 and it will
          drop out of the sitemap.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground font-medium">
          {row.kind === "CATEGORY" ? "Tagline" : "Summary"}
        </span>
        {/* The published text as the placeholder, so an empty box reads as
            "unchanged" rather than "blank". */}
        <textarea
          rows={2}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          placeholder={row.configText}
          className={FIELD}
        />
      </label>

      {row.kind === "SERVICE" && (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Call to action</span>
          <input
            value={cta}
            onChange={(event) => setCta(event.target.value)}
            placeholder={row.configCta ?? ""}
            className={FIELD}
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() =>
              updatePracticeAreaAction({
                slug: row.slug,
                kind: row.kind,
                visible,
                featured,
                summaryOverride: summary,
                ctaOverride: cta,
              }),
            )
          }
        >
          {pending ? "Saving…" : "Save"}
        </Button>

        {row.overridden && (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => run(() => resetPracticeAreaAction({ slug: row.slug }))}
          >
            Reset to published content
          </Button>
        )}
      </div>
    </div>
  );
}
