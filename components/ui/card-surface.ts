/**
 * The one card treatment, stated once.
 *
 * Every card on the site was carrying its own hand-written copy of
 * `border-border bg-card rounded-lg border` plus whatever hover state the block
 * happened to get. Six blocks, six slightly different answers, and no way to
 * change the card language without finding all of them. This is the constant
 * they all reference instead.
 *
 * ## `motion-safe:` is on the translate and NOT on the colour
 *
 * A border shifting hue is not motion. WCAG 2.3 and the reduced-motion
 * preference are about movement, and dropping the colour change under
 * `motion-reduce` would cost the hover affordance entirely for someone who
 * asked only that things stop sliding around. So the lift is gated and the
 * border is not.
 *
 * ## Why a string constant rather than a component
 *
 * These are applied to `<li>`, `<a>`, `<div>` and `<article>` across the site,
 * and often merged with a block's own layout classes. A component would force
 * every call site through an `asChild` escape hatch or a `className` passthrough
 * that just reassembles the string anyway.
 */
export const CARD_SURFACE =
  "border-border bg-card rounded-lg border transition-all duration-200 hover:border-primary/45 hover:shadow-lg hover:shadow-primary/5 motion-safe:hover:-translate-y-0.5";

/** The same, plus a focus ring — for a card that is itself a link or button. */
export const CARD_SURFACE_INTERACTIVE = `${CARD_SURFACE} focus-visible:ring-ring/50 focus-visible:ring-3 focus-visible:outline-none`;
