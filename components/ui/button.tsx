import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // `pointer-coarse:min-h-11 min-w-11` is the 44px touch-target minimum, applied
  // only where there is no mouse.
  //
  // The sizes below are built for dense admin UI — `sm` is 28px and `default`
  // is 32px, which is right under a cursor and far too small under a thumb.
  // Growing them unconditionally would mean redesigning every dashboard row to
  // fix a problem desktop does not have; gating on the input device gets the
  // 44px on phones and tablets and changes nothing on a laptop. One rule here
  // rather than an audit of every call site, so a button added later inherits
  // it without anyone remembering.
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none pointer-coarse:min-h-11 pointer-coarse:min-w-11 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        /*
         * `border-foreground/55`, not `border-border`.
         *
         * WCAG 2.2 SC 1.4.11 asks 3:1 of the visual boundary that identifies a
         * control. `--border` is tuned for grouping cards, not for outlining
         * controls, and on this palette it measures 1.41:1 against paper - an
         * outline button drawn with it is a label floating in space, which is
         * what shipped on the practice-area hubs until it was screenshotted.
         *
         * 55% of the foreground measures 3.48:1 on paper and 3.34:1 on linen,
         * the two grounds this button actually sits on. 50% misses on both
         * (3.01 / 2.92), which is why it is not a rounder number.
         *
         * Card borders are left alone: a card boundary is decorative grouping,
         * not a control, and darkening --border globally would make every card
         * on the site heavier to fix a problem only buttons have.
         */
        outline:
          "border-foreground/55 bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        /*
         * For the full-bleed `--ink` bands. Not a cosmetic variant.
         *
         * `default` and `outline` are built against the paper ground and both
         * fail on ink: measured on this palette, an `outline` button's label
         * (`--foreground` #152A40) lands at 1.11:1 on ink #0E2136 - invisible,
         * not merely low - and a `default` button's surface is 1.88:1 against
         * the band, so it barely reads as a control at all.
         *
         * These invert instead. `onInk` puts the band's own foreground down as
         * a solid surface (14.35:1 against the band, and the ink label on it is
         * the same 14.35:1); `onInkOutline` keeps the label at that ratio and
         * draws the border from it at 50% (4.58:1 against the band). 40% also
         * cleared the 3:1 non-text bar at 3.41:1, but read as a faint outline
         * rather than a control; the extra ten points buy the affordance.
         */
        onInk:
          "bg-ink-foreground text-ink hover:bg-ink-foreground/85 focus-visible:ring-ink-foreground/50",
        onInkOutline:
          "border-ink-foreground/50 text-ink-foreground hover:bg-ink-foreground/10 focus-visible:ring-ink-foreground/50",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
