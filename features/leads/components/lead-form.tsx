"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { HoneypotInput } from "@/components/ui/honeypot-input";
import { useScrollIntoViewWhen } from "@/hooks/use-scroll-into-view-when";
import { HONEYPOT_FIELD } from "@/lib/honeypot";
import { formatPhoneInput, PHONE_FORMAT, PHONE_MAX_LENGTH } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { useLeadSubmit } from "../hooks/use-lead-submit";
import {
  createLeadSchema,
  type CreateLeadFormValues,
  type CreateLeadInput,
} from "../schema/lead.schema";

/** One selectable practice area, flattened for the form by the server. */
export type PracticeAreaOption = {
  value: string;
  label: string;
  audience: "business" | "individual";
};

export type LeadFormProps = {
  /**
   * Options for the practice-area select. Passed in rather than imported:
   * this is a client component, and importing the content here would ship all
   * 48 services and their 144 FAQs to the browser to fill a dropdown.
   */
  practiceAreas?: PracticeAreaOption[];
  /**
   * Pre-selected context, resolved server-side from `/contact?service=`.
   *
   * When a service is named the select is not rendered at all - the visitor
   * came from that page, asking them to re-pick the thing they just clicked is
   * a question with a known answer. The values travel as hidden inputs, and the
   * server re-resolves them regardless (see api/submit-lead.ts), so nothing here
   * is trusted.
   */
  context?: {
    serviceSlug: string;
    serviceName: string;
    practiceAreaSlug: string;
    practiceAreaName: string;
    audience: "business" | "individual";
  };
  /**
   * `wide` pairs the short fields two-up once there is room for it.
   *
   * Not just cosmetics. A single column of eight full-width inputs reads as a
   * long form whatever its actual length, and length is the thing that stops
   * people finishing one. Pairing name/email and the two selects makes the same
   * fields look like half the work.
   *
   * The message box and the submit stay full width in both layouts: a textarea
   * narrowed to half a column is worse to type in, and a submit button should
   * not be hunted for.
   *
   * `stacked` remains the default so the narrow embeds are untouched.
   */
  layout?: "stacked" | "wide";
};

const FIELD =
  "border-foreground/25 bg-background focus-visible:border-ring focus-visible:ring-ring/50 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none";

export function LeadForm({ practiceAreas = [], context, layout = "stacked" }: LeadFormProps) {
  const { state, submit } = useLeadSubmit();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    // Three generics: the values the form holds, no context, and the
    // transformed values handleSubmit hands to `submit`. Without the third
    // the two sides of the transform are conflated.
  } = useForm<CreateLeadFormValues, unknown, CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: context
      ? {
          audience: context.audience,
          practiceAreaSlug: context.practiceAreaSlug,
          serviceSlug: context.serviceSlug,
        }
      : undefined,
  });

  // Registered once so the masking onChange can call RHF's handler after
  // rewriting the value.
  const phoneField = register("phone");

  // The confirmation replaces the form; without this it lands above the fold.
  const resultRef = useScrollIntoViewWhen<HTMLParagraphElement>(state.status === "success");

  if (state.status === "success") {
    return (
      <p ref={resultRef} className="text-foreground text-sm">
        Thanks for reaching out &mdash; we&apos;ll get back to you shortly.
      </p>
    );
  }

  const isWide = layout === "wide";
  /** Short fields pair up on `sm` and above; everything else spans the row. */
  const pair = isWide ? "sm:col-span-1" : "";

  const grouped = (["individual", "business"] as const).map((audience) => ({
    audience,
    label: audience === "individual" ? "For individuals and families" : "For business",
    options: practiceAreas.filter((option) => option.audience === audience),
  }));

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className={cn(
        "w-full",
        /*
         * Wide rows are: name | email, phone | country, practice area, message.
         *
         * Every paired row is full. The first attempt ran practice-area |
         * country, name | email, phone | — which left Phone alone beside a
         * visible hole, and the hole is what made the form look unfinished at
         * 1440px rather than any shortage of width.
         */
        isWide ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "flex max-w-md flex-col gap-4",
      )}
    >
      <HoneypotInput registration={register(HONEYPOT_FIELD)} />

      {context && (
        <div className="contents">
          {/* Resolved server-side and re-resolved server-side on submit. These
              exist so the value survives the round trip, not as a source of
              truth. */}
          <input type="hidden" {...register("audience")} />
          <input type="hidden" {...register("practiceAreaSlug")} />
          <input type="hidden" {...register("serviceSlug")} />
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5", pair)}>
        <label htmlFor="name" className="text-foreground text-sm font-medium">
          Name
        </label>
        <input id="name" {...register("name")} className={FIELD} />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>

      <div className={cn("flex flex-col gap-1.5", pair)}>
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email
        </label>
        <input id="email" type="email" {...register("email")} className={FIELD} />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      <div className={cn("flex flex-col gap-1.5", pair)}>
        <label htmlFor="phone" className="text-foreground text-sm font-medium">
          Phone <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="phone"
          {...phoneField}
          // Masks as you type: enter digits, the punctuation appears.
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
        {errors.phone && <p className="text-destructive text-sm">{errors.phone.message}</p>}
      </div>

      <div className={cn("flex flex-col gap-1.5", pair)}>
        <label htmlFor="jurisdiction" className="text-foreground text-sm font-medium">
          Which country? <span className="text-muted-foreground">(optional)</span>
        </label>
        <select id="jurisdiction" {...register("jurisdiction")} className={FIELD}>
          <option value="">Not sure</option>
          <option value="CA">Canada</option>
          <option value="US">United States</option>
          <option value="BOTH">Both</option>
        </select>
      </div>

      {/*
        Full width, and last of the optional fields.

        It is the longest label and the longest option list in the form, so a
        half-width column truncated its optgroups; and asking "what is this
        about" after the contact details matches the order somebody actually
        thinks in - who I am, how to reach me, then what it concerns.
      */}
      {!context && practiceAreas.length > 0 && (
        <div className={cn("flex flex-col gap-1.5", isWide && "sm:col-span-2")}>
          <label htmlFor="practiceAreaSlug" className="text-foreground text-sm font-medium">
            What is this about? <span className="text-muted-foreground">(optional)</span>
          </label>
          {/*
            Optional, deliberately. Somebody who does not know which category
            their problem belongs to is exactly the person most in need of
            writing in; a required field here turns the easiest route to the
            firm into a quiz about legal taxonomy.

            `audience` is not asked for separately - the server derives it from
            whichever category is chosen, so the two can never disagree.
          */}
          <select id="practiceAreaSlug" {...register("practiceAreaSlug")} className={FIELD}>
            <option value="">I&apos;m not sure yet</option>
            {grouped.map((group) => (
              <optgroup key={group.audience} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      <div className={cn("flex flex-col gap-1.5", isWide && "sm:col-span-2")}>
        <label htmlFor="message" className="text-foreground text-sm font-medium">
          {context ? `How can we help with ${context.serviceName.toLowerCase()}?` : "Message"}
        </label>
        <textarea
          id="message"
          rows={5}
          {...register("message")}
          className={cn(FIELD, "resize-y")}
        />
        {errors.message && <p className="text-destructive text-xs">{errors.message.message}</p>}
        <p className="text-muted-foreground text-xs">
          Please don&apos;t send anything confidential or time-critical &mdash; this form does not
          create a solicitor-client or attorney-client relationship.
        </p>
      </div>

      {state.status === "error" && (
        <p className={cn("text-destructive text-sm", isWide && "sm:col-span-2")} role="alert">
          {state.message}
        </p>
      )}

      <div className={cn(isWide && "sm:col-span-2")}>
        <Button
          type="submit"
          size={isWide ? "lg" : "default"}
          disabled={isSubmitting || state.status === "submitting"}
          className={cn(
            "transition-transform duration-200 motion-safe:hover:-translate-y-0.5",
            isWide && "w-full sm:w-auto",
          )}
        >
          {isSubmitting || state.status === "submitting" ? "Sending…" : "Send message"}
        </Button>
      </div>
    </form>
  );
}
