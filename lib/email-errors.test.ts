import { describe, expect, it } from "vitest";
import { EmailAddressRejectedError } from "./email";
import { mapSendError } from "./email-errors";

/** A nodemailer-shaped failure. */
function smtpError(code: string, message = "boom") {
  return Object.assign(new Error(message), { code });
}

describe("mapSendError", () => {
  it("points at the credentials for an auth failure", () => {
    expect(mapSendError(smtpError("EAUTH"))).toMatch(/credentials/i);
  });

  /**
   * The case that actually misled someone: a local relay on port 1025 with
   * "Use TLS" left ticked reported "check the host and port" against a host and
   * port that were both correct. ESOCKET means the socket opened and the
   * handshake failed, which is a different problem with a different fix.
   */
  it("blames the TLS setting, not the host, for a handshake failure", () => {
    const message = mapSendError(
      smtpError("ESOCKET", "SSL routines:tls_validate_record_header:wrong version number"),
    );

    expect(message).toMatch(/TLS/i);
    expect(message).toMatch(/465|587|1025/);
    expect(message).not.toMatch(/check the host and port/i);
  });

  it.each(["ECONNREFUSED", "ETIMEDOUT", "ECONNECTION", "EDNS"])(
    "blames the host and port for %s",
    (code) => {
      expect(mapSendError(smtpError(code))).toMatch(/host and port/i);
    },
  );

  it("reports a rejected recipient as such", () => {
    expect(mapSendError(new EmailAddressRejectedError())).toMatch(/address/i);
  });

  it("distinguishes a permanent refusal from a temporary one", () => {
    expect(mapSendError(Object.assign(new Error("x"), { responseCode: 550 }))).toMatch(/refused/i);
    expect(mapSendError(Object.assign(new Error("x"), { responseCode: 421 }))).toMatch(
      /try again/i,
    );
  });

  it("points at domain verification when Resend rejects the message", () => {
    expect(mapSendError(new Error("Resend rejected the message: validation_error"))).toMatch(
      /verified/i,
    );
  });

  it("falls back to something plain for an unrecognised failure", () => {
    expect(mapSendError(new Error("who knows"))).toBe("The message could not be sent.");
  });

  /**
   * The whole point of mapping rather than passing the message through:
   * provider errors echo API-key prefixes, SMTP usernames and full recipient
   * addresses, and this string is stored and rendered in the dashboard.
   */
  it("never leaks the underlying message", () => {
    const leaky = smtpError(
      "EAUTH",
      "535 auth failed for user frontdesk@business.test with key re_live_abc123",
    );

    const message = mapSendError(leaky);
    expect(message).not.toContain("re_live_abc123");
    expect(message).not.toContain("frontdesk@business.test");
  });
});
