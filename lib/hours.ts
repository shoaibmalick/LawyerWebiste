/** A day of the business's week, as `config/site.config.ts` records it. */
export type OpeningHours = {
  day: string;
  opens: string | null;
  closes: string | null;
};

const DAY_LABEL: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/**
 * Collapses the week into the shortest true sentence about opening hours.
 *
 * "Tue–Fri 10:00–19:00 · Sat 09:00–17:00", rather than seven lines most of
 * which say the same thing. Consecutive days sharing the same hours become a
 * range; a single day stays a single day.
 *
 * **Closed days are dropped, not listed as closed.** This is written for a
 * one-line strip that tells someone when they can come in, which is a
 * different job from a full timetable — "Sun Closed" spends a fifth of that
 * line on the answer nobody came for. A block that genuinely needs to show
 * closures should render `business.hours` directly instead.
 *
 * **A gap breaks a run, and that is deliberate.** A business open Mon and Wed
 * but closed Tue produces "Mon 09:00–17:00 · Wed 09:00–17:00", never
 * "Mon–Wed", because the range form would claim it opens on a day it does not.
 * Runs are built over the filtered list in config order, so this depends on
 * `hours` being in day order — which the schema's own example and every client
 * config follow.
 */
export function summariseOpeningHours(hours: OpeningHours[]): string {
  const open = hours.filter(
    (h): h is OpeningHours & { opens: string; closes: string } =>
      Boolean(h.opens) && Boolean(h.closes),
  );

  const runs: { from: string; to: string; opens: string; closes: string }[] = [];

  for (const day of open) {
    const last = runs.at(-1);
    const isConsecutive =
      last !== undefined &&
      adjacentInWeek(last.to, day.day) &&
      last.opens === day.opens &&
      last.closes === day.closes;

    if (isConsecutive) {
      last.to = day.day;
    } else {
      runs.push({ from: day.day, to: day.day, opens: day.opens, closes: day.closes });
    }
  }

  return runs
    .map((run) => {
      const days =
        run.from === run.to
          ? (DAY_LABEL[run.from] ?? run.from)
          : `${DAY_LABEL[run.from] ?? run.from}–${DAY_LABEL[run.to] ?? run.to}`;
      return `${days} ${run.opens}–${run.closes}`;
    })
    .join("  ·  ");
}

const WEEK_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Is `next` the calendar day immediately after `previous`? */
function adjacentInWeek(previous: string, next: string): boolean {
  const a = WEEK_ORDER.indexOf(previous);
  const b = WEEK_ORDER.indexOf(next);
  if (a === -1 || b === -1) return false;
  return b === a + 1;
}
