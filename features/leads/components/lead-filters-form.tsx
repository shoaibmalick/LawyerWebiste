import Form from "next/form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FIELD } from "@/components/ui/field";
import { listAllPracticeAreas } from "@/config/content/practice-areas";
import type { LeadFilters } from "@/server/services/leadService";

/**
 * A server component — the URL holds the filter state, so there is nothing to
 * keep in sync and no client bundle to ship.
 *
 * `next/form` with a string action gives native GET-form semantics (so it
 * works with JavaScript disabled) plus client-side navigation and prefetch
 * when JS is available. Reloading a filtered URL returning the same rows is
 * also the proof that filtering happens on the server rather than over the
 * hundred rows that happen to be on screen.
 */
export function LeadFiltersForm({ active }: { active: LeadFilters }) {
  const hasFilters = Object.keys(active).length > 0;

  return (
    <Form action="" className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-4">
      {/*
       * Keyed so the inputs remount whenever the active filters change.
       * next/form navigates client-side, which leaves the DOM nodes in place —
       * so without this, "Clear filters" would empty the URL and the list
       * while the boxes still showed the old text. The key cannot go on <Form>
       * itself: it is unsupported there when the action is a string.
       */}
      <div key={JSON.stringify(active)} className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Name</span>
          <input name="name" defaultValue={active.name ?? ""} className={FIELD} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Email</span>
          <input name="email" defaultValue={active.email ?? ""} className={FIELD} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Phone</span>
          <input
            name="phone"
            defaultValue={active.phone ?? ""}
            className={FIELD}
            // The search is a literal substring, so "9055550148" will not find
            // "(905) 555-0148". Saying so beats a search that quietly misses.
            placeholder="as it was typed"
          />
        </label>

        {/*
          Grouped by audience, because the two halves of the firm are triaged by
          different people and the twelve categories mean nothing as a flat list.
          Value is the slug; parseLeadFilters checks it against the real content
          and drops anything it does not recognise, so a hand-edited query string
          cannot produce a filter that silently matches zero rows.
        */}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Practice area</span>
          <select
            name="practiceArea"
            defaultValue={active.practiceAreaSlug ?? ""}
            className={FIELD}
          >
            <option value="">Any</option>
            {(["individual", "business"] as const).map((audience) => (
              <optgroup
                key={audience}
                label={audience === "individual" ? "Individuals" : "Business"}
              >
                {listAllPracticeAreas()
                  .filter((area) => area.audience === audience)
                  .map((area) => (
                    <option key={area.slug} value={area.slug}>
                      {area.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground font-medium">Status</span>
          <select name="status" defaultValue={active.status ?? ""} className={FIELD}>
            <option value="">Any</option>
            <option value="NEW">New</option>
            <option value="HANDLED">Handled</option>
          </select>
        </label>
      </div>

      <Button type="submit" size="sm">
        Filter
      </Button>

      {hasFilters && (
        // A Link, not type="reset". Reset restores each field's defaultValue
        // without navigating, so the URL — and therefore the list — would not
        // change at all.
        <Link
          href="/dashboard/leads"
          className="text-muted-foreground hover:text-foreground px-2 py-2 text-sm underline underline-offset-4"
        >
          Clear filters
        </Link>
      )}
    </Form>
  );
}
