import { getBusiness } from "@/features/site-settings";
import { sendEmail } from "@/lib/email";
import { plainTextToHtml } from "@/lib/email-shell";
import { leadService } from "@/server/services/leadService";
import type { QuoteRequestInput } from "../schema/quote.schema";
import { calculateEstimate } from "./calculate-estimate";

export async function submitQuoteRequest(input: QuoteRequestInput) {
  const estimate = calculateEstimate(input.serviceSlug, input.selections);
  if (!estimate) {
    throw new Error("Unknown service.");
  }

  const breakdown = [
    `Base price: $${estimate.basePrice}`,
    ...estimate.lineItems.map((item) => `${item.label}: $${item.amount}`),
    `Estimated total: $${estimate.total}`,
  ].join("\n");

  const lead = await leadService.createLead({
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: `Quote request for ${estimate.serviceName}:\n${breakdown}`,
  });

  /**
   * Assembled as plain text and escaped exactly once, on the way out.
   *
   * The previous version interpolated `input.email` and `input.phone` straight
   * into an HTML string and hand-rolled the line breaks with
   * `breakdown.replace(/\n/g, "<br />")`. Both are the defects the security
   * conventions name directly: an unescaped customer value in outbound mail is
   * a working link in a message carrying the business's own SPF and DKIM, and
   * inserting markup before escaping is the inversion `plainTextToHtml` exists
   * to make impossible.
   *
   * Building one plain-text body and handing it to `plainTextToHtml` leaves a
   * single escaping point rather than one per interpolation, so there is no
   * per-field decision left to get wrong. It also gives the message a text
   * alternative, which it never had.
   */
  const body = [
    `From: ${input.name}`,
    `Email: ${input.email}`,
    ...(input.phone ? [`Phone: ${input.phone}`] : []),
    "",
    `Quote request for ${estimate.serviceName}`,
    breakdown,
  ].join("\n");

  await sendEmail({
    to: (await getBusiness()).email,
    // sendEmail strips CR/LF from subjects centrally, and a subject is not
    // HTML — so this needs no escaping, only the header-injection guard it
    // already gets.
    subject: `New quote request from ${input.name} — ${estimate.serviceName}`,
    html: plainTextToHtml(body),
    text: body,
  });

  return { lead, estimate };
}
