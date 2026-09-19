"use server";

import { emailTemplates } from "@/config/content/email-templates";
import { getBusiness } from "@/features/site-settings";
import { services } from "@/config/content/services";
import { requireAdmin } from "@/lib/auth-guards";
import { diagnoseEmailConfig } from "@/lib/email-config";
import { formatDateTimeLong } from "@/lib/format";
import { bookingService } from "@/server/services/bookingService";
import { leadService } from "@/server/services/leadService";
import { mailMessageService } from "@/server/services/mailMessageService";
import { composeContextSchema } from "../schema/send-email.schema";
import { renderTemplate, type PlaceholderValues } from "./render-template";
import { toSentMessage, type SentMessage } from "./sent-message";

/**
 * Everything the compose panel needs, in one round trip when it opens.
 *
 * Fetched lazily rather than for every row on page load, for the same reason
 * `getCallContextAction` is: the list runs to a hundred rows and this would be
 * an N+1 across all of them for information nobody has asked to see.
 *
 * Templates come back **already substituted**. Rendering them in the browser
 * would mean shipping the placeholder values, and `appointment_time` has to go
 * through `formatDateTimeLong`, which reads the business timezone from config —
 * that has no business in the browser bundle. Same rule the call panel follows.
 */

export type ComposeTemplate = {
  key: string;
  label: string;
  subject: string;
  body: string;
};

export type ComposeContext = {
  /** Shown, never typed — the panel has no recipient field. */
  recipientName: string;
  recipientEmail: string;
  templates: ComposeTemplate[];
  history: SentMessage[];
  /** False when no transport is configured; the panel says so before you type. */
  canSend: boolean;
};

export type ComposeContextResult =
  { ok: true; context: ComposeContext } | { ok: false; error: string };

function templatesFor(kind: "booking" | "lead", values: PlaceholderValues): ComposeTemplate[] {
  return emailTemplates
    .filter((template) => template.appliesTo.includes(kind))
    .map((template) => ({
      key: template.key,
      label: template.label,
      subject: renderTemplate(template.subject, values),
      body: renderTemplate(template.body, values),
    }));
}

export async function getComposeContextAction(input: unknown): Promise<ComposeContextResult> {
  await requireAdmin();

  const parsed = composeContextSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "That record reference isn't valid." };
  }

  const subject = parsed.data.subject;
  const business = await getBusiness();
  const { config } = await diagnoseEmailConfig();
  const canSend = config.provider !== "NONE";

  if (subject.kind === "booking") {
    const booking = await bookingService.getBookingById(subject.bookingId);
    if (!booking) {
      return { ok: false, error: "That booking no longer exists — this list is out of date." };
    }

    const service = services.find((candidate) => candidate.slug === booking.serviceSlug);
    const values: PlaceholderValues = {
      customer_name: booking.customerName,
      business_name: business.name,
      business_phone: business.phone,
      service_name: service?.name ?? booking.serviceSlug,
      appointment_time: formatDateTimeLong(booking.slot.startsAt),
    };

    const history = await mailMessageService.listForBooking(booking.id);

    return {
      ok: true,
      context: {
        recipientName: booking.customerName,
        recipientEmail: booking.customerEmail,
        templates: templatesFor("booking", values),
        history: history.map(toSentMessage),
        canSend,
      },
    };
  }

  const lead = await leadService.getLeadById(subject.leadId);
  if (!lead) {
    return { ok: false, error: "That message no longer exists — this list is out of date." };
  }

  const values: PlaceholderValues = {
    customer_name: lead.name,
    business_name: business.name,
    business_phone: business.phone,
  };

  const history = await mailMessageService.listForLead(lead.id);

  return {
    ok: true,
    context: {
      recipientName: lead.name,
      recipientEmail: lead.email,
      templates: templatesFor("lead", values),
      history: history.map(toSentMessage),
      canSend,
    },
  };
}
