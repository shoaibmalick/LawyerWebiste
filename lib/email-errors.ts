import { EmailAddressRejectedError } from "@/lib/email";

/**
 * Turns a provider failure into something safe to show and store.
 *
 * ## Never the raw message
 *
 * Provider errors are chatty. Resend echoes the address it refused; nodemailer
 * puts the SMTP dialogue in `response`, which routinely contains the username
 * that failed to authenticate and sometimes a fragment of the credential. Both
 * end up in `MailMessage.error`, which is rendered in the dashboard and read
 * back by whoever is on the desk. The same reasoning is written out on
 * `EmailAddressRejectedError`, which keeps the address out of its own message.
 *
 * ## And never a bare "something went wrong"
 *
 * The person reading this has just typed their own mail credentials in. "The
 * mail account rejected our credentials" tells them to check the password;
 * "could not reach the mail server" tells them to check the host and port.
 * That distinction is the difference between a fixable problem and a support
 * call, so the mapping is coarse but deliberate.
 */

/** Codes nodemailer sets on the error object itself. */
const AUTH_CODES = new Set(["EAUTH"]);
const CONNECTION_CODES = new Set(["ECONNREFUSED", "ETIMEDOUT", "ECONNECTION", "EDNS"]);

/**
 * `ESOCKET` is kept apart from the other connection failures because it almost
 * always means one specific, self-inflicted thing: TLS was demanded on a port
 * that speaks plain SMTP, or the reverse. The socket opened and then the
 * handshake failed, so the host and port were *right* — and telling someone to
 * check them sends them to re-verify the two settings that are already correct.
 *
 * Found the hard way: a local relay on port 1025 with "Use TLS" left ticked
 * reported "check the host and port" against a host and port that were both
 * fine.
 */
const TLS_MISMATCH_CODE = "ESOCKET";

function codeOf(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "responseCode" in error) {
    const status = (error as { responseCode: unknown }).responseCode;
    if (typeof status === "number") return status;
  }
  return undefined;
}

export function mapSendError(error: unknown): string {
  if (error instanceof EmailAddressRejectedError) {
    return "That email address doesn't look like a single valid address, so nothing was sent.";
  }

  const code = codeOf(error);
  if (code && AUTH_CODES.has(code)) {
    return "The mail account rejected our credentials. Check the username and password.";
  }
  if (code === TLS_MISMATCH_CODE) {
    return "Couldn't start a secure connection. The TLS setting usually doesn't match the port — try turning it off for port 587 or 1025, and on for port 465.";
  }
  if (code && CONNECTION_CODES.has(code)) {
    return "Could not reach the mail server. Check the host and port.";
  }

  const status = statusOf(error);
  // 5xx from an SMTP server is a permanent refusal of this message; 4xx is a
  // temporary one. Both are the server's answer rather than our connection.
  if (status && status >= 500) {
    return "The mail server refused the message.";
  }
  if (status && status >= 400) {
    return "The mail server wouldn't accept the message just now. Try again shortly.";
  }

  if (error instanceof Error && error.message.startsWith("Resend rejected")) {
    return "The email provider rejected the message. Check the from address is on a domain you've verified.";
  }

  if (error instanceof Error && /from address/i.test(error.message)) {
    return "The from address isn't configured properly. Check it in the email settings.";
  }

  return "The message could not be sent.";
}
