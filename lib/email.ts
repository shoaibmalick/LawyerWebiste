import { Resend } from "resend";
import { resolveEmailConfig } from "@/lib/email-config";
import { sanitiseSubject } from "@/lib/html";

/**
 * Outbound email.
 *
 * Two layers on purpose. `sendEmailWith` is the transport: it takes a config,
 * applies every header guard, and talks to a provider. `sendEmail` is what the
 * rest of the app calls: it resolves the business's stored configuration first
 * and hands off. Splitting them keeps this file's tests free of the database,
 * and keeps the guards in one place rather than one copy per provider.
 */

/**
 * Where email goes and who it comes from.
 *
 * `from` arrives already composed — `resolveEmailConfig` assembles it from the
 * stored name and address, or reads RESEND_FROM_EMAIL. This layer never asks
 * where the values came from.
 */
export type EmailTransportConfig =
  | { provider: "RESEND"; apiKey: string; from: string; replyTo?: string }
  | {
      provider: "SMTP";
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      password?: string;
      from: string;
      replyTo?: string;
    }
  | { provider: "NONE" };

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative. Free to produce and materially better for delivery. */
  text?: string;
};

/**
 * Whether the message actually left.
 *
 * This exists because "nothing is configured" used to be indistinguishable from
 * "sent" — `sendEmail` resolved either way — and callers acted on the
 * difference without being able to see it. `confirmBookingAction` marked the
 * confirmation email sent for a message that was never sent, which in the
 * Stripe webhook is precisely what stops a retry re-attempting it.
 */
export type EmailSendOutcome =
  { delivered: true; provider: "RESEND" | "SMTP" } | { delivered: false; reason: "unconfigured" };

/**
 * `jane.doe@example.com` -> `j***@example.com`.
 *
 * This line only fires when email is unconfigured, which in production means
 * sends are being dropped — worth a log. But server logs are a lower-trust
 * store than the database, and a customer's address in one is a disclosure with
 * no upside. The domain survives because that is the part worth debugging.
 */
function redactEmail(address: string): string {
  const at = address.indexOf("@");
  if (at < 1) return "***";
  return `${address[0]}***${address.slice(at)}`;
}

/**
 * Exactly one bare address, and nothing that could become a second one.
 *
 * Anchored, and the character class excludes every separator and delimiter an
 * address could hide a payload behind: whitespace (so CR and LF cannot appear),
 * comma and semicolon (recipient separators), angle brackets and parentheses
 * (display-name and comment syntax), quotes and backslash (quoted-string
 * escapes). What is left is a plain `local@domain.tld`.
 *
 * Deliberately narrower than RFC 5322, which permits quoted local parts and
 * comments that no customer will ever type and that only widen the space of
 * strings a downstream parser might disagree with us about.
 */
export const SINGLE_ADDRESS = /^[^\s@,;<>()[\]\\"]+@[^\s@,;<>()[\]\\".]+(\.[^\s@,;<>()[\]\\".]+)+$/;

export class EmailAddressRejectedError extends Error {
  constructor() {
    // No address in the message: it is attacker-controlled and this string
    // reaches logs.
    super("Refusing to send: the recipient address is not a single valid address.");
    this.name = "EmailAddressRejectedError";
  }
}

/**
 * Reject, never sanitise.
 *
 * Trimming a hostile recipient down to its "safe part" would still deliver to
 * the attacker on any transport that splits on a comma, and would do it
 * silently. A refusal is loud and cannot be half-right.
 *
 * Resend takes JSON and does its own encoding, so this is defence in depth
 * rather than a known hole in the current transport — but `to` is the one
 * header field that legitimately carries a value a stranger typed, and the
 * transport is a dependency that can change under us. SMTP, added since, is
 * exactly the sort of change meant: nodemailer builds real headers.
 */
function assertSingleAddress(value: string): string {
  if (!SINGLE_ADDRESS.test(value)) throw new EmailAddressRejectedError();
  return value;
}

/**
 * Sends via an explicitly supplied configuration.
 *
 * Every guard lives here, before the provider branch, so adding a third
 * transport cannot skip one.
 */
export async function sendEmailWith(
  config: EmailTransportConfig,
  { to, subject, html, text }: SendEmailInput,
): Promise<EmailSendOutcome> {
  // Before anything else, including the not-configured branch below: an
  // address is invalid on its own terms, and a configuration appearing later
  // must not change that answer.
  const safeTo = assertSingleAddress(to);

  // Centralised rather than applied per template: subjects are built from user
  // input in several places, and a choke point cannot be forgotten by the next
  // template someone adds. `html` deliberately is NOT escaped here — it is
  // assembled markup by the time it arrives, so escaping it would show every
  // customer raw tags. Escaping belongs at each interpolation site; see
  // lib/html.ts.
  const safeSubject = sanitiseSubject(subject);

  if (config.provider === "NONE") {
    console.warn(
      `[email] no mail transport configured — skipping send to ${redactEmail(safeTo)}: "${safeSubject}"`,
    );
    return { delivered: false, reason: "unconfigured" };
  }

  // `from` is configuration, not user input, so the display-name form
  // `Practice <hello@business.test>` is legitimate here and must survive. A
  // newline in it would still split headers, though, so it is refused rather
  // than trusted — a misconfiguration guard, not an attack path.
  if (!config.from) {
    throw new Error("No from address is configured for outbound email");
  }
  if (/[\r\n]/.test(config.from)) {
    throw new Error("The configured from address contains a line break");
  }

  // Stricter than `from`, because it is closer to `to` in risk: an owner who
  // pastes something odd into reply-to would otherwise be adding a header we
  // never validated. Display names are not accepted here.
  if (config.replyTo) assertSingleAddress(config.replyTo);

  if (config.provider === "RESEND") {
    // Constructed per send rather than once at module load, so a credentials
    // change from the dashboard takes effect immediately instead of whenever
    // the serverless instance happens to recycle.
    const resend = new Resend(config.apiKey);
    const { error } = await resend.emails.send({
      from: config.from,
      to: safeTo,
      subject: safeSubject,
      html,
      ...(text ? { text } : {}),
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    });

    // Resend reports failures in the response body rather than by throwing.
    // Returning here would report a delivery that did not happen.
    if (error) throw new Error(`Resend rejected the message: ${error.name}`);

    return { delivered: true, provider: "RESEND" };
  }

  // Imported here rather than at the top of the file on purpose: nodemailer is
  // a CommonJS package with dynamic requires, and a static import drags it into
  // the module graph of everything that touches email — including this file's
  // own tests, which mock neither it nor a mail server.
  const { createTransport } = await import("nodemailer");
  const transporter = createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    ...(config.user ? { auth: { user: config.user, pass: config.password ?? "" } } : {}),
  });

  try {
    await transporter.sendMail({
      from: config.from,
      to: safeTo,
      subject: safeSubject,
      html,
      ...(text ? { text } : {}),
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    });
  } finally {
    // Not pooled. A handful of messages a day buys nothing from a cached
    // connection, and a cached one would outlive a credentials change.
    transporter.close();
  }

  return { delivered: true, provider: "SMTP" };
}

/**
 * Sends using whatever the business has configured.
 *
 * Fails soft in exactly one case — no transport at all — which is the rule this
 * has always had, restated now that there is more than one provider. A
 * configured transport that fails throws, because the caller can say something
 * useful about it: the dashboard actions tell the staff member to pass the
 * detail on during the call she is already having.
 */
export async function sendEmail(message: SendEmailInput): Promise<EmailSendOutcome> {
  return sendEmailWith(await resolveEmailConfig(), message);
}
