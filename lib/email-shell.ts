import { siteConfig } from "@/config/site.config";
import { escapeHtml } from "@/lib/html";

/**
 * Turns plain text a member of staff typed into the HTML of an email.
 *
 * ## This file hardcodes colours and sizes, deliberately
 *
 * CLAUDE.md forbids that in components, and is right to: the site's design
 * tokens exist so nothing drifts. An email is not a component. It renders
 * inside someone else's client, which strips `<head>`, ignores most of a
 * stylesheet, and has never heard of a CSS custom property — Gmail in
 * particular discards `<style>` blocks outright. Inline attributes on a table
 * are the only thing that survives the round trip. Do not "fix" this by
 * reaching for `text-body` or `var(--color-ink)`; the result renders as
 * unstyled text in half the world's inboxes.
 */

/**
 * Escape first, *then* add markup.
 *
 * The order is the entire correctness of this function. Inserting `<br />` and
 * escaping afterwards escapes the `<br />` too, and the customer reads the tag.
 * Escaping afterwards is also how a `<a href="…">` typed into the compose box
 * would become a working link in a message from the business's own domain —
 * which is phishing, sent by us, with our SPF and DKIM on it.
 *
 * A blank line starts a new paragraph; a single newline is a line break. That
 * is what someone typing into a textarea means by them.
 */
export function plainTextToHtml(text: string): string {
  return escapeHtml(text.replace(/\r\n/g, "\n"))
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1f2937;">${paragraph.replace(/\n/g, "<br />")}</p>`,
    )
    .join("");
}

/**
 * Wraps already-assembled body markup in the business's envelope.
 *
 * Takes HTML rather than text because the booking templates build their own
 * markup — `plainTextToHtml` is for the free-form compose box specifically.
 *
 * A 560px table centred in a full-width table: the layout every mail client
 * from Outlook 2013 onwards renders the same way. Nothing here is clever, on
 * purpose.
 */
export function emailShell(bodyHtml: string): string {
  const business = siteConfig.business;
  const name = escapeHtml(business.name);
  const phone = escapeHtml(business.phone);
  const address = escapeHtml(
    `${business.address.street}, ${business.address.city}, ${business.address.state} ${business.address.zip}`,
  );

  return [
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f6f4;padding:24px 12px;">',
    '<tr><td align="center">',
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;padding:32px;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;">',
    "<tr><td>",
    `<p style="margin:0 0 24px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;">${name}</p>`,
    bodyHtml,
    '<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />',
    `<p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">${name} · ${phone}<br />${address}</p>`,
    "</td></tr></table>",
    "</td></tr></table>",
  ].join("");
}

/**
 * The plain-text alternative, sent alongside the HTML.
 *
 * Costs nothing to produce and materially helps deliverability — a
 * multipart message looks less like bulk mail than an HTML-only one, which is
 * the whole subject of docs/EMAIL_DOMAIN_SETUP.md.
 */
export function emailPlainText(text: string): string {
  const business = siteConfig.business;
  return `${text.trim()}\n\n—\n${business.name} · ${business.phone}`;
}
