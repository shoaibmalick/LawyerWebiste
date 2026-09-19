import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail, sendEmailWith, type EmailTransportConfig } from "./email";

/**
 * G6 — email header injection.
 *
 * H1 escaped the HTML *bodies*. This covers the headers, which it did not.
 *
 * The surface was once narrow by construction: `sendEmail` accepted only
 * `{ to, subject, html }`, so there was no `cc`, `bcc` or `replyTo` for an
 * attacker to reach at all. Two things have widened it since, and both are
 * covered below — a `replyTo` the business owner can now set from the
 * dashboard, and an SMTP transport that builds real headers rather than
 * handing JSON to an API.
 *
 * These tests assert on the payload handed to the provider, because that is the
 * only place the question is actually settled.
 */

// Typed with its payload parameter so `mock.calls[0][0]` is inspectable —
// asserting on what the provider actually received is the whole point here.
const send = vi.hoisted(() =>
  vi.fn(async (_payload: Record<string, unknown>) => ({ data: null, error: null })),
);

const sendMail = vi.hoisted(() => vi.fn(async (_payload: Record<string, unknown>) => ({})));
const close = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

vi.mock("nodemailer", () => ({
  createTransport: () => ({ sendMail, close }),
}));

/**
 * Keeps the database out of this file. `sendEmail` resolves the business's
 * stored settings before sending; returning a SERVER row means it falls through
 * to the environment, which is what every test here is written against. The
 * stored-configuration paths are `lib/email-config.test.ts`'s job.
 */
vi.mock("@/server/services/emailSettingsService", () => ({
  emailSettingsService: {
    getSettings: vi.fn(async () => ({ id: 1, provider: "SERVER" })),
  },
}));

beforeEach(() => {
  send.mockClear();
  sendMail.mockClear();
  close.mockClear();
  process.env.RESEND_API_KEY = "re_test_key_not_real";
  process.env.RESEND_FROM_EMAIL = "Acme Dental <hello@business.test>";
  // No vi.resetModules(): the Resend client is built per send now, rather than
  // once at module load, so nothing here is cached across a test.
});

/** The single argument object Resend was called with. */
function sentPayload(): Record<string, unknown> {
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0]![0];
}

/** The single argument object nodemailer was called with. */
function smtpPayload(): Record<string, unknown> {
  expect(sendMail).toHaveBeenCalledTimes(1);
  return sendMail.mock.calls[0]![0];
}

const SMTP: EmailTransportConfig = {
  provider: "SMTP",
  host: "smtp.business.test",
  port: 587,
  secure: false,
  from: "Acme Dental <hello@business.test>",
};

describe("recipients", () => {
  it("passes a clean address through unchanged", async () => {
    await sendEmail({ to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(sentPayload().to).toBe("jane@example.com");
  });

  /**
   * The injection this exists for. A `to` of
   * `jane@example.com\r\nBcc: attacker@evil.test` would, against a transport
   * that builds headers by concatenation, silently copy every appointment
   * confirmation to a third party.
   */
  const HOSTILE: [string, string][] = [
    ["CRLF then a Bcc header", "jane@example.com\r\nBcc: attacker@evil.test"],
    ["bare LF then a Bcc header", "jane@example.com\nBcc: attacker@evil.test"],
    ["bare CR", "jane@example.com\rBcc: attacker@evil.test"],
    ["a second address after a comma", "jane@example.com,attacker@evil.test"],
    ["a second address after a semicolon", "jane@example.com;attacker@evil.test"],
    ["a display-name wrapper hiding a second address", "Jane <jane@example.com>, <evil@evil.test>"],
    ["angle brackets", "<jane@example.com>"],
    ["a trailing header fragment", "jane@example.com%0d%0aBcc:attacker@evil.test"],
  ];

  it.each(HOSTILE)("refuses %s, and sends nothing at all", async (_label, hostile) => {
    await expect(sendEmail({ to: hostile, subject: "Hi", html: "<p>Hi</p>" })).rejects.toThrow();

    // The refusal must happen before the transport is touched. Sending to the
    // "safe part" of a hostile address would still deliver to the attacker on
    // any transport that splits on the comma.
    expect(send).not.toHaveBeenCalled();
  });

  /**
   * The same guards, on the transport that actually concatenates headers. They
   * live before the provider branch precisely so a new transport cannot be
   * added that skips them — this asserts that is still true.
   */
  it.each(HOSTILE)("refuses %s over SMTP too", async (_label, hostile) => {
    await expect(
      sendEmailWith(SMTP, { to: hostile, subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow();

    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("subject", () => {
  it("strips control characters from a subject built out of user input", async () => {
    await sendEmail({
      to: "hello@business.test",
      subject: "New enquiry from Jane\r\nBcc: attacker@evil.test",
      html: "<p>x</p>",
    });

    const payload = sentPayload();
    expect(payload.subject).not.toMatch(/[\r\n]/);
    expect(payload.subject).toBe("New enquiry from Jane Bcc: attacker@evil.test");
  });

  it("strips them over SMTP too", async () => {
    await sendEmailWith(SMTP, {
      to: "hello@business.test",
      subject: "New enquiry from Jane\r\nBcc: attacker@evil.test",
      html: "<p>x</p>",
    });

    expect(smtpPayload().subject).not.toMatch(/[\r\n]/);
  });
});

describe("from", () => {
  it("keeps the configured display-name form, which is not user input", async () => {
    await sendEmail({ to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(sentPayload().from).toBe("Acme Dental <hello@business.test>");
  });

  /**
   * `from` comes from configuration, so this is a misconfiguration guard rather
   * than an attack path — but a newline in it would be a header split just the
   * same, and the cost of refusing it is nothing.
   */
  it("refuses a from address containing a newline", async () => {
    process.env.RESEND_FROM_EMAIL = "Practice <hello@business.test>\r\nBcc: attacker@evil.test";

    await expect(
      sendEmail({ to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});

/**
 * New surface: the owner types this into /dashboard/settings, so unlike `from`
 * it is not something the agency wrote. Held to the recipient's standard rather
 * than the sender's — no display names, no second address.
 */
describe("reply-to", () => {
  it("passes a clean reply-to through", async () => {
    await sendEmailWith(
      { ...SMTP, replyTo: "frontdesk@business.test" },
      { to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" },
    );

    expect(smtpPayload().replyTo).toBe("frontdesk@business.test");
  });

  it("omits reply-to entirely when none is configured", async () => {
    await sendEmailWith(SMTP, { to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(smtpPayload()).not.toHaveProperty("replyTo");
  });

  it.each([
    ["a newline", "frontdesk@business.test\r\nBcc: attacker@evil.test"],
    ["a second address", "frontdesk@business.test,attacker@evil.test"],
    ["a display name", "Front Desk <frontdesk@business.test>"],
  ])("refuses a reply-to containing %s", async (_label, hostile) => {
    await expect(
      sendEmailWith(
        { ...SMTP, replyTo: hostile },
        { to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" },
      ),
    ).rejects.toThrow();

    expect(sendMail).not.toHaveBeenCalled();
  });
});

describe("the SMTP transport", () => {
  it("reports which provider delivered the message", async () => {
    const outcome = await sendEmailWith(SMTP, {
      to: "jane@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
      text: "Hi",
    });

    expect(outcome).toEqual({ delivered: true, provider: "SMTP" });
    expect(smtpPayload().text).toBe("Hi");
  });

  it("closes the transport even when the send fails", async () => {
    sendMail.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    await expect(
      sendEmailWith(SMTP, { to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow();

    // Not pooled, so nothing else will reclaim it — a throw that skipped this
    // would leak a socket per failed send.
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("the Resend transport", () => {
  it("reports which provider delivered the message", async () => {
    const outcome = await sendEmail({
      to: "jane@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });

    expect(outcome).toEqual({ delivered: true, provider: "RESEND" });
  });

  /**
   * Resend reports failures in the response body rather than by throwing.
   * Returning success here would tell the dashboard a message was delivered
   * that the provider had just refused.
   */
  it("throws when Resend reports an error in the response", async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", message: "bad" },
    } as never);

    await expect(
      sendEmail({ to: "jane@example.com", subject: "Hi", html: "<p>Hi</p>" }),
    ).rejects.toThrow(/Resend rejected/);
  });
});

describe("when no transport is configured", () => {
  it("still refuses a hostile recipient rather than logging it as skipped", async () => {
    delete process.env.RESEND_API_KEY;

    // The address is rejected on its own terms, not merely because there is
    // no transport today. A key appearing later must not change the answer.
    await expect(
      sendEmail({ to: "jane@example.com\r\nBcc: evil@evil.test", subject: "x", html: "<p>x</p>" }),
    ).rejects.toThrow();
  });

  /**
   * The distinction the whole EmailSendOutcome type exists for. Resolving
   * silently is what let confirmBookingAction mark a confirmation email sent
   * that had never been sent.
   */
  it("reports that nothing was delivered", async () => {
    delete process.env.RESEND_API_KEY;

    const outcome = await sendEmail({
      to: "jane@example.com",
      subject: "Hi",
      html: "<p>Hi</p>",
    });

    expect(outcome).toEqual({ delivered: false, reason: "unconfigured" });
    expect(send).not.toHaveBeenCalled();
  });
});
