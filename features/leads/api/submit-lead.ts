import { AUDIENCE_SEGMENT, findPracticeArea, findService } from "@/config/content/practice-areas";
import { getBusiness } from "@/features/site-settings";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { escapeHtml } from "@/lib/html";
import { leadService } from "@/server/services/leadService";
import type { CreateLeadInput } from "../schema/lead.schema";

/**
 * Where the lead came from, resolved against the real content.
 *
 * The schema proves `serviceSlug` *looks* like a slug. It cannot prove the slug
 * names something, because a Zod schema has no way to see the content module.
 * This does, and the difference matters in three ways:
 *
 *  - An unknown slug is **dropped**, not stored. It arrives from a query string
 *    (`/contact?service=...`), so it is attacker-controlled; filing it would put
 *    a chosen string into the firm's inbox and dashboard under a label that says
 *    "practice area".
 *  - `audience` and `practiceAreaSlug` are **derived from the resolved service**
 *    rather than taken from the request. A form post claiming a criminal-defence
 *    service belongs to the business side would otherwise route a lead to the
 *    wrong lawyer, and nothing downstream would question it.
 *  - The category is resolved the same way when only a practice area was chosen
 *    and no service.
 *
 * Returns only what survived. The caller never sees the raw values again.
 */
function resolveContext(input: CreateLeadInput) {
  const service = input.serviceSlug ? findService(input.serviceSlug) : undefined;

  if (service) {
    return {
      audience: service.area.audience,
      practiceAreaSlug: service.area.slug,
      serviceSlug: service.service.slug,
      // Kept for the email, never stored — the link is derived, not supplied.
      url: `${siteUrl}/${AUDIENCE_SEGMENT[service.area.audience]}/${service.area.slug}/${service.service.slug}`,
      label: `${service.service.name} (${service.area.name})`,
    };
  }

  // No service, or one that does not exist. Fall back to the category, which
  // has to be checked against the audience the request claims — findPracticeArea
  // scopes by audience, so a mismatched pair resolves to nothing.
  const area =
    input.audience && input.practiceAreaSlug
      ? findPracticeArea(input.audience, input.practiceAreaSlug)
      : undefined;

  if (area) {
    return {
      audience: area.audience,
      practiceAreaSlug: area.slug,
      serviceSlug: undefined,
      url: `${siteUrl}/${AUDIENCE_SEGMENT[area.audience]}/${area.slug}`,
      label: area.name,
    };
  }

  return {
    audience: input.audience,
    practiceAreaSlug: undefined,
    serviceSlug: undefined,
    url: undefined,
    label: undefined,
  };
}

const JURISDICTION_LABELS: Record<string, string> = {
  CA: "Canada",
  US: "United States",
  BOTH: "Both Canada and the United States",
};

export async function submitLead(input: CreateLeadInput) {
  const context = resolveContext(input);

  const lead = await leadService.createLead({
    name: input.name,
    email: input.email,
    phone: input.phone,
    message: input.message,
    audience: context.audience,
    practiceAreaSlug: context.practiceAreaSlug,
    serviceSlug: context.serviceSlug,
    jurisdiction: input.jurisdiction,
  });

  // Every value below is typed by an anonymous member of the public, and
  // `message` is unconstrained free text. Unescaped, it lands as live markup
  // in an email from the firm's own domain — see lib/html.ts.
  //
  // `context.label` and `context.url` are built from the content module rather
  // than from the request, so they are not attacker-controlled — but they are
  // escaped anyway. Escaping at interpolation rather than at the source is the
  // rule precisely so that nobody has to re-derive which values are safe.
  const jurisdiction = input.jurisdiction ? JURISDICTION_LABELS[input.jurisdiction] : undefined;

  await sendEmail({
    to: (await getBusiness()).email,
    subject: context.label
      ? `New enquiry: ${context.label} — ${input.name}`
      : `New website inquiry from ${input.name}`,
    html: `
      <p>New inquiry from ${escapeHtml(input.name)} (${escapeHtml(input.email)}${
        input.phone ? `, ${escapeHtml(input.phone)}` : ""
      }):</p>
      ${
        context.label
          ? `<p><strong>Practice area:</strong> ${escapeHtml(context.label)}${
              context.url
                ? ` — <a href="${escapeHtml(context.url)}">${escapeHtml(context.url)}</a>`
                : ""
            }</p>`
          : ""
      }
      ${jurisdiction ? `<p><strong>Jurisdiction:</strong> ${escapeHtml(jurisdiction)}</p>` : ""}
      <p>${escapeHtml(input.message)}</p>
    `,
  });

  return lead;
}
