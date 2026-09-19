import type { Placeholder } from "@/config/schema/email-templates.schema";

/**
 * Fills a template's placeholders.
 *
 * Pure, and deliberately in the plain-text domain with **no escaping**. The
 * result goes into a textarea, is stored as plain text, and is escaped exactly
 * once — much later, in `lib/email-shell.ts`. Escaping here as well would show
 * the staff member `Reid &amp; Sons` in the compose box and store it that way,
 * which is the double-escaping CLAUDE.md's "escape at the point of
 * interpolation, never at storage" rule exists to prevent.
 *
 * Runs at prefill only, never at send. What was in the box when Send was
 * pressed is exactly what goes out and exactly what is logged — so a
 * staff member who types `{{business_phone}}` herself sees it delivered
 * literally rather than watching the server rewrite her message.
 */

export type PlaceholderValues = Partial<Record<Placeholder, string>>;

const PLACEHOLDER_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/g;

export function renderTemplate(text: string, values: PlaceholderValues): string {
  // One pass, so a value that happens to contain `{{…}}` is not expanded in
  // turn. A customer called "{{customer_name}}" is absurd, but a service name
  // with braces in it is only a config edit away.
  return text.replace(PLACEHOLDER_PATTERN, (match, name: string) => {
    const value = values[name as Placeholder];
    if (value === undefined) return match;
    return value;
  });
}
