import { Scale } from "lucide-react";
import { PRACTICE_AREA_ICONS } from "@/config/content/practice-areas/icon-map";
import { cn } from "@/lib/utils";

type PracticeAreaIconProps = {
  /** A kebab-case lucide name from the content, e.g. "heart-pulse". */
  name: string;
  className?: string;
};

/**
 * One icon, looked up by the name the content gives it.
 *
 * Falls back to `Scale` rather than throwing. The icon map is generated from
 * the same markdown the name comes from, so a miss should be impossible - but
 * "should be impossible" is a poor reason to take a whole practice-area page
 * down over a decorative glyph. A test asserts the map is exhaustive, which is
 * where a missing icon ought to surface.
 *
 * `aria-hidden` throughout: every one of these sits beside a heading that says
 * the same thing in words, so announcing it would just be repetition.
 */
export function PracticeAreaIcon({ name, className }: PracticeAreaIconProps) {
  const Icon = PRACTICE_AREA_ICONS[name] ?? Scale;

  return <Icon aria-hidden className={cn("size-5 shrink-0", className)} strokeWidth={1.75} />;
}
