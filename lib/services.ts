import type { Service } from "@/config/schema/content.schema";

export type ServiceGroup = {
  /** null is the trailing group of services with no category set. */
  category: string | null;
  services: Service[];
};

/**
 * Groups services for display, without reordering them.
 *
 * Two properties the callers depend on. Groups come out in the order their
 * category is first seen in config, and services keep their config order
 * inside a group — so the whole menu's ordering stays editable in one place by
 * moving lines in `config/content/services.ts`, which is where a person
 * arranging a price list expects to work. Sorting alphabetically here would
 * take that control away and put "Balayage" above "Root Touch Up" on a menu
 * whose author wanted the cheap, quick things first.
 *
 * Uncategorised services collect into a trailing `null` group rather than
 * being dropped. `category` is optional (see content.schema.ts), so a client
 * that has not adopted it renders exactly one group and looks as it always did.
 */
export function groupServicesByCategory(services: Service[]): ServiceGroup[] {
  const byCategory = new Map<string, Service[]>();
  const uncategorised: Service[] = [];

  for (const service of services) {
    if (service.category === undefined) {
      uncategorised.push(service);
      continue;
    }
    const existing = byCategory.get(service.category);
    if (existing) existing.push(service);
    else byCategory.set(service.category, [service]);
  }

  // Map iteration is insertion order for string keys, which is what gives
  // first-appearance ordering without keeping a separate index.
  const groups: ServiceGroup[] = [...byCategory].map(([category, list]) => ({
    category,
    services: list,
  }));

  if (uncategorised.length > 0) groups.push({ category: null, services: uncategorised });

  return groups;
}

/**
 * A category name as a stable anchor id.
 *
 * Lives here rather than in a block because two components need the same
 * answer: the heading that carries the id, and the card that links to it. Two
 * copies of this would drift the first time one of them learned about an
 * accent, and the link would then land nowhere with no error anywhere.
 *
 * Strips non-ASCII rather than transliterating it — "Ombré Brows" becomes
 * `ombr-brows`. Ugly in a URL bar and completely stable, which is the property
 * an anchor target actually needs; a transliteration table is a dependency and
 * a source of drift for something nobody reads aloud.
 */
export function slugifyCategory(category: string): string {
  return category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Where a service card in `ServicesGrid` points.
 *
 * Here rather than inline in the block, for the reason `slugifyCategory` above
 * already states: a link's construction living in one place is what stops the
 * two halves of it drifting apart with no error anywhere. This function exists
 * because they did. Every card shipped pointing at `/?service=<slug>#booking`
 * — the kit's shape, correct while the booking form sat on the homepage — long
 * after `Booking` moved to its own route here. The anchor resolved against a
 * page that no longer carries it, so clicking a card loaded the homepage and
 * stopped. A missing anchor target scrolls nowhere and reports nothing, which
 * is why it survived a build, a lint and a full test run.
 *
 * `bookingPath` is the route the `Booking` block renders on. Both parts of the
 * result earn their place: `?service=` is what `BookingForm` reads to preselect
 * the dropdown, and `#booking` is what puts the visitor at the form rather than
 * at the top of whatever page it lives on.
 *
 * A trailing slash is stripped so `"/"` and `"/consultation/"` both produce one
 * well-formed URL rather than `"//?service=…"` or a `/consultation/?service=…`
 * that Next then has to redirect. The root collapses back to `"/"`, since an
 * empty path is not one.
 */
export function bookingCardHref(bookingPath: string, serviceSlug: string): string {
  const base = bookingPath.replace(/\/+$/, "");
  return `${base || "/"}?service=${encodeURIComponent(serviceSlug)}#booking`;
}
