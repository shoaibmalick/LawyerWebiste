import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeTransport, diagnoseEmailConfig, resolveEmailConfig } from "./email-config";
import { sealSecret } from "./secret-box";

/**
 * Which configuration wins, and what happens when the stored one cannot be
 * used. Every branch here has to end somewhere sendable or somewhere honestly
 * unconfigured — this function is not allowed to throw, because it runs inside
 * a booking confirmation.
 */

const getSettings = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/emailSettingsService", () => ({
  emailSettingsService: { getSettings },
}));

/** A stored row, with everything not under test left at its column default. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    provider: "SERVER",
    fromName: null,
    fromAddress: null,
    replyTo: null,
    resendApiKey: null,
    smtpHost: null,
    smtpPort: null,
    smtpSecure: true,
    smtpUser: null,
    smtpPassword: null,
    updatedAt: new Date(),
    updatedByEmail: null,
    ...overrides,
  };
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  getSettings.mockReset();
  process.env.AUTH_SECRET = "test-auth-secret-for-email-config";
  process.env.RESEND_API_KEY = "re_from_the_environment";
  process.env.RESEND_FROM_EMAIL = "Env Practice <env@business.test>";
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("the SERVER provider", () => {
  it("reads the environment", async () => {
    getSettings.mockResolvedValue(row({ provider: "SERVER" }));

    expect(await resolveEmailConfig()).toEqual({
      provider: "RESEND",
      apiKey: "re_from_the_environment",
      from: "Env Practice <env@business.test>",
    });
  });

  it("is NONE when the environment is empty too", async () => {
    delete process.env.RESEND_API_KEY;
    getSettings.mockResolvedValue(row({ provider: "SERVER" }));

    expect(await resolveEmailConfig()).toEqual({ provider: "NONE" });
  });

  it("is NONE when a key is set but no from address is", async () => {
    delete process.env.RESEND_FROM_EMAIL;
    getSettings.mockResolvedValue(row({ provider: "SERVER" }));

    // Better than sending with a missing sender and letting the provider
    // decide: the send would throw at the transport with a stranger error.
    expect(await resolveEmailConfig()).toEqual({ provider: "NONE" });
  });
});

describe("the RESEND provider", () => {
  it("beats the environment", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "RESEND",
        resendApiKey: sealSecret("re_from_the_database"),
        fromName: "Acme Dental",
        fromAddress: "hello@business.test",
      }),
    );

    expect(await resolveEmailConfig()).toEqual({
      provider: "RESEND",
      apiKey: "re_from_the_database",
      from: "Acme Dental <hello@business.test>",
      replyTo: undefined,
    });
  });

  it("uses the bare address when no display name is set", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "RESEND",
        resendApiKey: sealSecret("re_x"),
        fromAddress: "hello@business.test",
      }),
    );

    const config = await resolveEmailConfig();
    expect(config.provider === "RESEND" && config.from).toBe("hello@business.test");
  });

  /**
   * The display name is configuration, but it is configuration the owner types.
   * Stripping rather than quoting keeps the result reviewable by eye.
   */
  it("strips header-breaking characters from the display name", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "RESEND",
        resendApiKey: sealSecret("re_x"),
        fromName: 'Practice"\r\n<evil@evil.test>',
        fromAddress: "hello@business.test",
      }),
    );

    const config = await resolveEmailConfig();
    expect(config.provider === "RESEND" && config.from).toBe(
      "Practice evil@evil.test <hello@business.test>",
    );
    expect(config.provider === "RESEND" && config.from).not.toMatch(/[\r\n"<>]evil/);
  });

  it("falls back to the environment when no from address is saved", async () => {
    getSettings.mockResolvedValue(row({ provider: "RESEND", resendApiKey: sealSecret("re_x") }));

    expect(await resolveEmailConfig()).toEqual({
      provider: "RESEND",
      apiKey: "re_from_the_environment",
      from: "Env Practice <env@business.test>",
    });
  });
});

describe("the SMTP provider", () => {
  it("decrypts the password and passes the host through", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "SMTP",
        smtpHost: "smtp.office365.test",
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: "frontdesk@business.test",
        smtpPassword: sealSecret("hunter2-but-longer"),
        fromAddress: "hello@business.test",
        replyTo: "frontdesk@business.test",
      }),
    );

    expect(await resolveEmailConfig()).toEqual({
      provider: "SMTP",
      host: "smtp.office365.test",
      port: 587,
      secure: false,
      user: "frontdesk@business.test",
      password: "hunter2-but-longer",
      from: "hello@business.test",
      replyTo: "frontdesk@business.test",
    });
  });

  /**
   * A local relay like Mailpit, and some internal hosts, accept unauthenticated
   * mail. Requiring a password would make the no-credentials click-through in
   * the plan impossible.
   */
  it("allows a host with no username at all", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "SMTP",
        smtpHost: "localhost",
        smtpPort: 1025,
        smtpSecure: false,
        fromAddress: "hello@business.test",
      }),
    );

    const config = await resolveEmailConfig();
    expect(config.provider).toBe("SMTP");
    expect(config.provider === "SMTP" && config.user).toBeUndefined();
  });

  it("falls back to the environment when the host or port is missing", async () => {
    getSettings.mockResolvedValue(
      row({ provider: "SMTP", smtpHost: "smtp.test", fromAddress: "hello@business.test" }),
    );

    expect((await resolveEmailConfig()).provider).toBe("RESEND");
  });
});

/**
 * The AUTH_SECRET rotation path. docs/PRIVACY_POSTURE.md lists rotating that
 * secret as the session kill switch, so this happens during an incident: it has
 * to degrade to "still sending, via the environment" and say so, not throw.
 */
describe("when a stored secret cannot be decrypted", () => {
  it("falls back to the environment and reports it", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "RESEND",
        resendApiKey: sealSecret("re_sealed_under_the_old_secret"),
        fromAddress: "hello@business.test",
      }),
    );
    process.env.AUTH_SECRET = "a-rotated-auth-secret";

    const { config, secretsReadable } = await diagnoseEmailConfig();

    expect(secretsReadable).toBe(false);
    expect(config).toEqual({
      provider: "RESEND",
      apiKey: "re_from_the_environment",
      from: "Env Practice <env@business.test>",
    });
    expect(errorSpy).toHaveBeenCalled();
  });

  it("reports it for SMTP too", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "SMTP",
        smtpHost: "smtp.test",
        smtpPort: 587,
        smtpUser: "frontdesk@business.test",
        smtpPassword: sealSecret("hunter2"),
        fromAddress: "hello@business.test",
      }),
    );
    process.env.AUTH_SECRET = "a-rotated-auth-secret";

    expect((await diagnoseEmailConfig()).secretsReadable).toBe(false);
  });

  /**
   * Whether a secret is readable is a fact about the secret, not about whether
   * this particular send wants it. Gating the decryption on the username meant
   * a host with no username reported everything as fine while holding a
   * credential it could not read.
   */
  it("reports an unreadable password even when no username needs it", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "SMTP",
        smtpHost: "localhost",
        smtpPort: 1025,
        smtpSecure: false,
        smtpUser: null,
        smtpPassword: sealSecret("left-behind"),
        fromAddress: "hello@business.test",
      }),
    );
    process.env.AUTH_SECRET = "a-rotated-auth-secret";

    expect((await diagnoseEmailConfig()).secretsReadable).toBe(false);
  });

  it("does not report one when no password is stored at all", async () => {
    getSettings.mockResolvedValue(
      row({
        provider: "SMTP",
        smtpHost: "localhost",
        smtpPort: 1025,
        smtpSecure: false,
        fromAddress: "hello@business.test",
      }),
    );

    expect((await diagnoseEmailConfig()).secretsReadable).toBe(true);
  });

  it("does not report a rotation when nothing needed decrypting", async () => {
    getSettings.mockResolvedValue(row({ provider: "SERVER" }));

    expect((await diagnoseEmailConfig()).secretsReadable).toBe(true);
  });
});

describe("when the settings table cannot be read", () => {
  /**
   * Mid-migration, or a database blip. The booking confirmation still has to go
   * out — this is the same fail-soft-to-a-default shape getActiveTheme uses.
   */
  it("falls back to the environment rather than throwing", async () => {
    getSettings.mockRejectedValue(new Error('relation "EmailSettings" does not exist'));

    expect(await resolveEmailConfig()).toEqual({
      provider: "RESEND",
      apiKey: "re_from_the_environment",
      from: "Env Practice <env@business.test>",
    });
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("describeTransport", () => {
  it("names the provider without leaking the credential", async () => {
    expect(
      describeTransport({
        provider: "SMTP",
        host: "smtp.office365.test",
        port: 587,
        secure: false,
        user: "frontdesk@business.test",
        password: "hunter2-but-longer",
        from: "hello@business.test",
      }),
    ).toBe("SMTP (smtp.office365.test:587) as hello@business.test");

    expect(
      describeTransport({ provider: "RESEND", apiKey: "re_secret", from: "hello@business.test" }),
    ).toBe("Resend as hello@business.test");

    expect(describeTransport({ provider: "NONE" })).toBe("no transport configured");
  });

  it("never includes a password or an API key", () => {
    const described = describeTransport({
      provider: "SMTP",
      host: "smtp.test",
      port: 587,
      secure: true,
      user: "frontdesk@business.test",
      password: "hunter2-but-longer",
      from: "hello@business.test",
    });

    expect(described).not.toContain("hunter2");
  });
});
