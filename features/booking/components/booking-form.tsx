"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { HoneypotInput } from "@/components/ui/honeypot-input";
import type { Service } from "@/config/schema/content.schema";
import { isFeatureEnabled } from "@/lib/features";
import { useScrollIntoViewWhen } from "@/hooks/use-scroll-into-view-when";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { formatPhoneInput, PHONE_FORMAT, PHONE_MAX_LENGTH } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type { BookableSlot } from "../api/get-available-slots";
import { useBookingSubmit } from "../hooks/use-booking-submit";
import { businessDayKey, calendarDayKey } from "../api/slot-day";
import {
  bookingFormSchema,
  OTHER_SERVICE_VALUE,
  type BookingFormInput,
} from "../schema/booking.schema";

const FIELD = "border-border bg-background rounded-lg border px-3 py-2 text-sm";
const LABEL = "text-foreground text-sm font-medium";

type BookingFormProps = {
  slots: BookableSlot[];
  /** Every service, not only those with availability — a visitor must be able
   *  to say what they want even when nothing is bookable for it. */
  services: Service[];
  /** IANA zone of the business — see siteConfig.business.timezone. */
  timezone: string;
  /**
   * The submit button's label.
   *
   * An action should keep the same name through the whole flow. A client whose
   * page heading and header button both say "Request an appointment" — because
   * on this kit a booking is a request until staff confirm it — should not
   * then present a button that says "Book appointment"; the two words describe
   * different promises, and the button is the one the visitor is about to act
   * on. Defaults to the kit's own wording.
   */
  submitLabel?: string;
};

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatLongDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}

export function BookingForm({
  slots,
  services,
  timezone,
  submitLabel = "Book appointment",
}: BookingFormProps) {
  const { state, submit, submitEnquiry } = useBookingSubmit();

  const requestedService = useSearchParams().get("service");

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormInput>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: { serviceSlug: "", slotId: "" },
  });

  // useWatch rather than watch(): watch() returns a fresh function each render
  // and cannot be memoized, so it can't be a dependency of the useMemo blocks
  // below without re-running them every render.
  const serviceSlug = useWatch({ control, name: "serviceSlug" });
  const slotId = useWatch({ control, name: "slotId" });
  const isEnquiry = serviceSlug === OTHER_SERVICE_VALUE;

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Registered once so the select can call RHF's own onChange alongside the
  // day/slot reset below.
  const serviceField = register("serviceSlug");

  // Same reason: the masking onChange has to call RHF's handler itself.
  const phoneField = register("customerPhone");

  // Every terminal state replaces a tall form with one line, collapsing the
  // page under the visitor's scroll position. See the hook for the full story.
  const isFinished =
    state.status === "requested" ||
    state.status === "success" ||
    state.status === "enquiry-sent" ||
    state.status === "redirecting";
  const resultRef = useScrollIntoViewWhen<HTMLDivElement>(isFinished);

  /**
   * Slots the chosen service actually fits into, ascending.
   *
   * A slot is a unit of the business's time — every service competes for the
   * same chair — so this filters on whether the treatment fits the slot's
   * length, not on the slot belonging to the service.
   */
  const serviceSlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.fitsServiceSlugs.includes(serviceSlug))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [slots, serviceSlug],
  );

  /** Which calendar days that service actually has openings on. */
  const openDayKeys = useMemo(
    () => new Set(serviceSlots.map((slot) => businessDayKey(slot.startsAt, timezone))),
    [serviceSlots, timezone],
  );

  const daySlots = useMemo(() => {
    if (!selectedDay) return [];
    const key = calendarDayKey(selectedDay);
    return serviceSlots.filter((slot) => businessDayKey(slot.startsAt, timezone) === key);
  }, [selectedDay, serviceSlots, timezone]);

  // A link carrying `?service=<slug>#booking` is a soft navigation: React
  // re-renders rather than remounting, so a defaultValue would never re-apply
  // and the requested service would be silently dropped. Scroll too — changing
  // the query re-renders this force-dynamic page and the hash is lost on the
  // way through, leaving the visitor at the top of the page.
  useEffect(() => {
    if (!requestedService) return;
    if (!services.some((service) => service.slug === requestedService)) return;

    setValue("serviceSlug", requestedService);
    formRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
  }, [requestedService, services, setValue]);

  async function onSubmit(values: BookingFormInput) {
    if (values.serviceSlug === OTHER_SERVICE_VALUE) {
      const timing = values.preferredTiming?.trim();
      await submitEnquiry({
        name: values.customerName,
        email: values.customerEmail,
        phone: values.customerPhone?.trim() || undefined,
        // Forwarded on both branches — the enquiry path posts to /api/leads,
        // which is just as worth protecting as the booking path.
        [HONEYPOT_FIELD]: values[HONEYPOT_FIELD],
        message: [
          "Booking enquiry — service not listed.",
          "",
          values.enquiryDetails?.trim() ?? "",
          timing ? `\nPreferred timing: ${timing}` : "",
        ]
          .join("\n")
          .trim(),
      });
      return;
    }

    await submit({
      slotId: values.slotId ?? "",
      serviceSlug: values.serviceSlug,
      customerName: values.customerName,
      customerEmail: values.customerEmail,
      customerPhone: values.customerPhone?.trim() || undefined,
      [HONEYPOT_FIELD]: values[HONEYPOT_FIELD],
    });
  }

  if (state.status === "requested" || state.status === "success") {
    // Two outcomes, and the difference matters enough to say out loud. A
    // website booking is a REQUEST the business rings about; only the deposit
    // path produces something already confirmed. Telling someone their
    // appointment is booked when it is not is how people arrive to a slot that
    // was given away.
    //
    // Before this branch existed the hook could land on "requested" and no
    // terminal state matched it, so the commonest outcome on the site — a
    // successful booking with no deposit — re-rendered the form and said
    // nothing at all.
    const requested = state.status === "requested";
    return (
      <div ref={resultRef} className="flex flex-col gap-2">
        <p className="text-foreground text-sm">
          {requested ? (
            <>
              Thanks — we&apos;ve got your request. <strong>Nothing is booked yet.</strong> Someone
              will call you shortly to confirm the time, or to find another if that one has gone.
            </>
          ) : (
            <>
              Thanks — your appointment is confirmed. We&apos;ve sent a confirmation to your email.
            </>
          )}
        </p>
        {isFeatureEnabled("customerAccounts") && (
          <p className="text-muted-foreground text-sm">
            <Link href="/account/signup" className="text-primary underline">
              Create an account
            </Link>{" "}
            to view and manage your bookings anytime.
          </p>
        )}
      </div>
    );
  }

  if (state.status === "enquiry-sent") {
    return (
      <div ref={resultRef}>
        <p className="text-foreground text-sm">
          Thanks — we&apos;ve got your enquiry and someone will get back to you to arrange a time.
          Nothing is booked yet.
        </p>
      </div>
    );
  }

  if (state.status === "redirecting") {
    return (
      <div ref={resultRef}>
        <p className="text-foreground text-sm">
          Redirecting you to a secure payment page to confirm your deposit…
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <HoneypotInput registration={register(HONEYPOT_FIELD)} />

      <div className="flex max-w-md flex-col gap-1.5">
        <label htmlFor="serviceSlug" className={LABEL}>
          What are you booking?
        </label>
        {/* Changing service invalidates any day and time already picked — that
            slot belongs to a different service and must never be submitted.
            Handled on the event rather than in an effect reacting to
            serviceSlug, which react-hooks/set-state-in-effect rightly flags. */}
        <select
          id="serviceSlug"
          {...serviceField}
          onChange={(event) => {
            void serviceField.onChange(event);
            setSelectedDay(undefined);
            setValue("slotId", "");
          }}
          className={FIELD}
        >
          <option value="" disabled>
            Choose a service
          </option>
          {services.map((service) => (
            <option key={service.slug} value={service.slug}>
              {service.name}
            </option>
          ))}
          <option value={OTHER_SERVICE_VALUE}>Something else / not sure</option>
        </select>
        {errors.serviceSlug && (
          <p className="text-destructive text-xs">{errors.serviceSlug.message}</p>
        )}
      </div>

      {isEnquiry ? (
        <>
          <div className="flex max-w-md flex-col gap-1.5">
            <label htmlFor="enquiryDetails" className={LABEL}>
              What do you need?
            </label>
            <textarea
              id="enquiryDetails"
              rows={4}
              {...register("enquiryDetails")}
              className={FIELD}
              placeholder="A short description — we'll work out the right appointment with you."
            />
            {errors.enquiryDetails && (
              <p className="text-destructive text-xs">{errors.enquiryDetails.message}</p>
            )}
          </div>

          <div className="flex max-w-md flex-col gap-1.5">
            <label htmlFor="preferredTiming" className={LABEL}>
              When suits you? (optional)
            </label>
            <input
              id="preferredTiming"
              {...register("preferredTiming")}
              className={FIELD}
              placeholder="Weekday mornings, after 5pm, etc."
            />
          </div>
        </>
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className={cn(LABEL, "mb-2")}>Pick a day</legend>

          {serviceSlug === "" ? (
            <p className="text-muted-foreground text-sm">
              Choose a service above and we&apos;ll show you when it&apos;s free.
            </p>
          ) : serviceSlots.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No openings long enough for this service right now — pick{" "}
              <span className="text-foreground font-medium">Something else / not sure</span> above,
              or call us and we&apos;ll find you a time.
            </p>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
              <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={(day) => {
                  setSelectedDay(day);
                  // Any previously chosen time belongs to the previous day.
                  setValue("slotId", "", { shouldValidate: false });
                }}
                // Only days this service actually has openings on are
                // selectable; everything else is inert rather than merely dim.
                disabled={(day) => !openDayKeys.has(calendarDayKey(day))}
                startMonth={new Date()}
                className="shrink-0"
              />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {!selectedDay || daySlots.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Days with openings are selectable. Pick one to see times.
                  </p>
                ) : (
                  <>
                    <p className="text-foreground text-sm font-semibold">
                      {formatLongDate(daySlots[0].startsAt, timezone)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {daySlots.map((slot) => (
                        <label
                          key={slot.id}
                          className={cn(
                            "border-border min-h-11 cursor-pointer rounded-lg border px-4 py-2.5 text-sm",
                            "hover:border-primary/50 hover:bg-secondary/60 transition-colors",
                            "has-[:focus-visible]:ring-ring/50 has-[:focus-visible]:ring-2",
                            slotId === slot.id &&
                              "border-primary bg-primary text-primary-foreground hover:bg-primary",
                          )}
                        >
                          <input
                            type="radio"
                            value={slot.id}
                            {...register("slotId")}
                            className="sr-only"
                          />
                          {formatTime(slot.startsAt, timezone)}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {errors.slotId && (
                  <p className="text-destructive text-xs">{errors.slotId.message}</p>
                )}
              </div>
            </div>
          )}
        </fieldset>
      )}

      <div className="flex max-w-md flex-col gap-1.5">
        <label htmlFor="customerName" className={LABEL}>
          Name
        </label>
        <input id="customerName" {...register("customerName")} className={FIELD} />
        {errors.customerName && (
          <p className="text-destructive text-xs">{errors.customerName.message}</p>
        )}
      </div>

      <div className="flex max-w-md flex-col gap-1.5">
        <label htmlFor="customerEmail" className={LABEL}>
          Email
        </label>
        <input id="customerEmail" type="email" {...register("customerEmail")} className={FIELD} />
        {errors.customerEmail && (
          <p className="text-destructive text-xs">{errors.customerEmail.message}</p>
        )}
      </div>

      <div className="flex max-w-md flex-col gap-1.5">
        <label htmlFor="customerPhone" className={LABEL}>
          Phone (optional)
        </label>
        <input
          id="customerPhone"
          {...phoneField}
          // Masks as you type — see lead-form.tsx.
          onChange={(event) => {
            event.target.value = formatPhoneInput(event.target.value);
            void phoneField.onChange(event);
          }}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={PHONE_MAX_LENGTH}
          placeholder={PHONE_FORMAT}
          className={FIELD}
        />
        {errors.customerPhone && (
          <p className="text-destructive text-sm">{errors.customerPhone.message}</p>
        )}
      </div>

      {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}

      <Button
        type="submit"
        className="self-start"
        disabled={isSubmitting || state.status === "submitting"}
      >
        {state.status === "submitting" ? "Sending…" : isEnquiry ? "Send enquiry" : submitLabel}
      </Button>
    </form>
  );
}
