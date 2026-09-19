import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { openSecret } from "@/lib/secret-box";
import { emailSettingsService, type EmailSettingsUpdate } from "./emailSettingsService";

const API_KEY = "re_live_not_a_real_key_0123456789";
const SMTP_PASSWORD = "hunter2-but-longer";

/** The non-secret half of a save, so each test only states what it is about. */
function baseUpdate(overrides: Partial<EmailSettingsUpdate> = {}): EmailSettingsUpdate {
  return {
    provider: "RESEND",
    fromName: "Acme Dental",
    fromAddress: "hello@business.test",
    replyTo: null,
    smtpHost: null,
    smtpPort: null,
    smtpSecure: true,
    smtpUser: null,
    updatedByEmail: "admin@business.test",
    ...overrides,
  };
}

describe("emailSettingsService", () => {
  beforeEach(async () => {
    await prisma.emailSettings.deleteMany();
  });

  afterAll(async () => {
    await prisma.emailSettings.deleteMany();
    await prisma.$disconnect();
  });

  it("materialises the singleton row on first read", async () => {
    const settings = await emailSettingsService.getSettings();

    expect(settings.id).toBe(1);
    // SERVER, so an existing deployment keeps reading the environment and
    // behaves exactly as it did before this table existed.
    expect(settings.provider).toBe("SERVER");
    expect(settings.resendApiKey).toBeNull();
    expect(settings.smtpSecure).toBe(true);
  });

  it("round-trips the non-secret fields", async () => {
    await emailSettingsService.saveSettings(
      baseUpdate({
        provider: "SMTP",
        smtpHost: "smtp.office365.test",
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: "frontdesk@business.test",
        replyTo: "frontdesk@business.test",
      }),
    );

    const saved = await emailSettingsService.getSettings();
    expect(saved.provider).toBe("SMTP");
    expect(saved.smtpHost).toBe("smtp.office365.test");
    expect(saved.smtpPort).toBe(587);
    expect(saved.smtpSecure).toBe(false);
    expect(saved.smtpUser).toBe("frontdesk@business.test");
    expect(saved.replyTo).toBe("frontdesk@business.test");
    expect(saved.updatedByEmail).toBe("admin@business.test");
  });

  it("writes settings even when the row has never been read", async () => {
    await emailSettingsService.saveSettings(baseUpdate({ resendApiKey: API_KEY }));

    expect((await emailSettingsService.getSettings()).provider).toBe("RESEND");
  });

  it("stores secrets encrypted, never in the clear", async () => {
    await emailSettingsService.saveSettings(
      baseUpdate({ resendApiKey: API_KEY, smtpPassword: SMTP_PASSWORD }),
    );

    const row = await prisma.emailSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(row.resendApiKey).not.toBe(API_KEY);
    expect(row.resendApiKey).toMatch(/^v1\./);
    expect(openSecret(row.resendApiKey)).toBe(API_KEY);
    expect(openSecret(row.smtpPassword)).toBe(SMTP_PASSWORD);
  });

  /**
   * The three-state rule. Blank must mean "keep", or an admin who edits the
   * from-name and saves silently wipes the API key and takes email down.
   */
  it("keeps a stored secret when the field is left blank", async () => {
    await emailSettingsService.saveSettings(baseUpdate({ resendApiKey: API_KEY }));
    await emailSettingsService.saveSettings(baseUpdate({ fromName: "Renamed Practice" }));

    const row = await prisma.emailSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(row.fromName).toBe("Renamed Practice");
    expect(openSecret(row.resendApiKey)).toBe(API_KEY);
  });

  it("treats an empty string the same as blank", async () => {
    await emailSettingsService.saveSettings(baseUpdate({ resendApiKey: API_KEY }));
    await emailSettingsService.saveSettings(baseUpdate({ resendApiKey: "" }));

    const row = await prisma.emailSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(openSecret(row.resendApiKey)).toBe(API_KEY);
  });

  /** The other half of the rule: without this there is no way to remove a key. */
  it("clears a secret when asked explicitly", async () => {
    await emailSettingsService.saveSettings(
      baseUpdate({ resendApiKey: API_KEY, smtpPassword: SMTP_PASSWORD }),
    );
    await emailSettingsService.saveSettings(baseUpdate({ clearResendApiKey: true }));

    const row = await prisma.emailSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(row.resendApiKey).toBeNull();
    // Clearing one must not disturb the other.
    expect(openSecret(row.smtpPassword)).toBe(SMTP_PASSWORD);
  });

  it("clear wins over a value supplied in the same save", async () => {
    await emailSettingsService.saveSettings(
      baseUpdate({ resendApiKey: API_KEY, clearResendApiKey: true }),
    );

    expect((await emailSettingsService.getSettings()).resendApiKey).toBeNull();
  });

  it("re-encrypts a replacement rather than appending to it", async () => {
    await emailSettingsService.saveSettings(baseUpdate({ resendApiKey: API_KEY }));
    await emailSettingsService.saveSettings(baseUpdate({ resendApiKey: "re_second_key" }));

    const row = await prisma.emailSettings.findUniqueOrThrow({ where: { id: 1 } });
    expect(openSecret(row.resendApiKey)).toBe("re_second_key");
  });

  it("does not reset the settings when they are read again", async () => {
    // A read is an upsert. If its `update` were ever anything but empty, every
    // outbound email would clobber the configuration it just read.
    await emailSettingsService.saveSettings(baseUpdate({ resendApiKey: API_KEY }));
    await emailSettingsService.getSettings();
    await emailSettingsService.getSettings();

    const row = await emailSettingsService.getSettings();
    expect(row.provider).toBe("RESEND");
    expect(openSecret(row.resendApiKey)).toBe(API_KEY);
  });

  /**
   * Required of any new singleton by CLAUDE.md, and not hypothetical here: this
   * row is read on every outbound email, and the booking flow sends the customer
   * confirmation and the business notification side by side.
   */
  it("survives concurrent first reads", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () => emailSettingsService.getSettings()),
    );

    expect(results).toHaveLength(8);
    expect(results.every((row) => row.id === 1)).toBe(true);
    expect(await prisma.emailSettings.count()).toBe(1);
  });

  it("survives a write racing a first read", async () => {
    const [, ...reads] = await Promise.all([
      emailSettingsService.saveSettings(baseUpdate({ provider: "SMTP", smtpHost: "smtp.test" })),
      emailSettingsService.getSettings(),
      emailSettingsService.getSettings(),
    ]);

    expect(reads.every((row) => row.id === 1)).toBe(true);
    expect((await emailSettingsService.getSettings()).provider).toBe("SMTP");
    expect(await prisma.emailSettings.count()).toBe(1);
  });

  it("keeps exactly one row however many times it is touched", async () => {
    await emailSettingsService.getSettings();
    await emailSettingsService.saveSettings(baseUpdate());
    await emailSettingsService.getSettings();

    expect(await prisma.emailSettings.count()).toBe(1);
  });
});
