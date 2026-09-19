import { Reveal } from "@/components/motion/reveal";
import type { Service } from "@/config/schema/content.schema";
import { BookingForm, type BookableSlot } from "@/features/booking";

type BookingProps = {
  slots: BookableSlot[];
  /** Every service, not just the ones with availability — the form lists them
   *  all so a visitor can say what they want even when nothing is bookable. */
  services: Service[];
  timezone: string;
  /** Overrides for clients who reserve, enrol, or take enquiries rather than book. */
  title?: string;
  deck?: string;
  /** Rendered as the alternative to the form. Omit to hide the line entirely. */
  phone?: string;
  /** The submit button's label. Keep it in the same words as `title`. */
  submitLabel?: string;
};

/**
 * What actually happens after the button is pressed.
 *
 * Hardcoded because it describes the kit's booking model rather than any one
 * client's copy: a website booking is created `REQUESTED`, holds the slot's
 * capacity, and becomes an appointment only when staff confirm it — see
 * `BookingStatus` in prisma/schema.prisma and `CAPACITY_HOLDING_STATUSES` in
 * server/services/bookingService.ts. Every client on this kit works that way.
 *
 * Numbered because this is genuinely a sequence: one step follows another in
 * time and the order is the information. Most numbered lists on a marketing
 * page are decoration wearing the costume of structure; this one is not.
 */
const STEPS = [
  {
    title: "You send a request",
    body: "Pick what you want and when. Nothing is charged, and nothing is final yet.",
  },
  {
    title: "We call you back",
    body: "We check the details, answer anything you are unsure about, and agree the price with you.",
  },
  {
    title: "It is confirmed",
    body: "Only then is the time held for you, and you get it in writing.",
  },
];

/**
 * The booking band: the process on one side, the form on the other.
 *
 * A dark full-bleed band rather than another white section, because this is
 * the one thing the whole page is asking for and it should read as the anchor
 * of the page rather than as the next block down.
 *
 * **The form sits in a light card on purpose.** `BookingForm` is feature code
 * styled with the theme's own tokens — `text-foreground`, `border-border`,
 * `bg-background`. Dropping it straight onto `bg-ink` would put dark text on a
 * dark field. The card gives it the light ground its styles already assume, so
 * this block can be redesigned without reaching into the feature slice.
 *
 * **The three steps earn their place.** The most common thing a visitor does
 * not know about a booking form on a small-business site is whether pressing
 * the button actually booked anything. On this kit it does not — it files a
 * request — and saying so next to the form is worth more than any amount of
 * reassurance copy.
 */
export function Booking({
  slots,
  services,
  timezone,
  title = "Book an appointment",
  deck = "Tell us what you need and when suits you. We call to confirm before anything is held.",
  phone,
  submitLabel,
}: BookingProps) {
  return (
    <section id="booking" className="bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:py-24 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <Reveal>
          <div className="lg:sticky lg:top-24">
            <p className="text-accent font-mono text-xs font-medium tracking-[0.2em] uppercase">
              Booking
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {title}
            </h2>
            <p className="text-ink-muted mt-4 max-w-md text-pretty">{deck}</p>

            <ol className="mt-10 space-y-6">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="border-ink-muted/40 text-ink-muted mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs tabular-nums"
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{step.title}</p>
                    <p className="text-ink-muted mt-1 text-sm text-pretty">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {phone && (
              <p className="text-ink-muted mt-10 text-sm">
                Prefer to talk?{" "}
                <a
                  href={`tel:${phone}`}
                  className="text-ink-foreground hover:text-accent font-mono underline underline-offset-4 transition-colors"
                >
                  {phone}
                </a>
              </p>
            )}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="bg-background text-foreground border-border/10 rounded-2xl border p-6 shadow-2xl sm:p-8">
            <BookingForm
              slots={slots}
              services={services}
              timezone={timezone}
              submitLabel={submitLabel}
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
