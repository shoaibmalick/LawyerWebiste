/**
 * The class list every dashboard form control uses.
 *
 * ## Why a constant rather than a component
 *
 * These are plain `<input>`, `<select>` and `<textarea>` elements inside admin
 * forms — there is no behaviour to wrap, only a shared look. Five components
 * had each declared their own identical `const FIELD` (booking-list,
 * booking-filters-form, lead-filters-form, email-settings-form, compose-panel),
 * which is exactly the shape that drifts: none of the five set a width, none
 * set a height, and all five were 14px.
 *
 * ## Why a `.ts` constant rather than a `globals.css` utility
 *
 * The public site already has the right thing — `@utility field-input` in
 * `app/globals.css`, with `min-height: 2.875rem`. But `globals.css` is this
 * client's own design system and does not merge upstream, whereas the admin UI
 * is the kit's and does. Putting it here means the next client inherits it.
 *
 * ## The two rules that are not cosmetic
 *
 * `min-h-11` is 44px, the touch-target minimum — matching the rule
 * `components/ui/button.tsx` applies under `pointer-coarse`.
 *
 * `pointer-coarse:text-base` is 16px. **iOS Safari zooms the whole page when a
 * focused input is under 16px**, and every admin field was 14px — so tapping
 * any of them scrolled the layout sideways and left the admin pinching back
 * out. Desktop keeps 14px, where the density is wanted and no zoom happens.
 */
export const FIELD =
  "border-border w-full min-h-11 rounded-md border px-3 py-2 text-sm pointer-coarse:text-base";
