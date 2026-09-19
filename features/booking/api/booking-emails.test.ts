import { describe, expect, it, vi } from "vitest";
import {
  bookingConfirmedEmail,
  bookingRequestNotificationEmail,
  bookingRequestReceivedEmail,
  bookingRescheduledEmail,
} from "./booking-emails";

vi.mock("@/config/site.config", () => ({
  siteConfig: {
    business: {
      name: "Test Practice",
      phone: "(905) 555-0148",
      email: "hello@practice.test",
      // Required. formatDateTimeLong defaults its `timeZone` argument to
      // siteConfig.business.timezone, and Intl treats `undefined` as "use the
      // host's zone" rather than failing — so omitting it made every assertion
      // below depend on the machine running the tests. They passed on an
      // Eastern machine and failed on a Central one, which is exactly what
      // happened.
      timezone: "America/Toronto",
    },
  },
}));

// 17:00 UTC is 1:00 PM in Toronto during daylight saving.
const AFTERNOON = new Date("2026-08-04T17:00:00.000Z");
const NEXT_WEEK = new Date("2026-08-11T14:00:00.000Z");

const appointment = {
  customerName: "Jane Doe",
  serviceName: "Routine cleaning",
  startsAt: AFTERNOON,
};

describe("bookingRequestReceivedEmail", () => {
  /**
   * The one thing this email must not do is imply the appointment is booked.
   * The patient turning up to a time nobody agreed to is the failure the whole
   * request workflow exists to prevent.
   */
  it("says plainly that nothing is booked yet", () => {
    const { html } = bookingRequestReceivedEmail(appointment);

    expect(html).toMatch(/isn't booked yet/i);
    expect(html).toMatch(/call you/i);
  });

  it("never promises the appointment is confirmed", () => {
    const { subject, html } = bookingRequestReceivedEmail(appointment);

    expect(subject).not.toMatch(/confirmed/i);
    expect(html).not.toMatch(/is confirmed/i);
  });

  it("shows the time in the practice's timezone", () => {
    expect(bookingRequestReceivedEmail(appointment).html).toContain("1:00 PM");
  });
});

describe("bookingRequestNotificationEmail", () => {
  it("gives the practice what it needs to make the call", () => {
    const { html } = bookingRequestNotificationEmail({
      ...appointment,
      customerEmail: "jane@example.com",
      customerPhone: "905-555-0199",
      dashboardUrl: "https://example.test/dashboard/bookings",
    });

    expect(html).toContain("Jane Doe");
    expect(html).toContain("jane@example.com");
    expect(html).toContain("905-555-0199");
    expect(html).toContain("https://example.test/dashboard/bookings");
  });

  it("says so when there is no phone number, rather than rendering nothing", () => {
    const { html } = bookingRequestNotificationEmail({
      ...appointment,
      customerEmail: "jane@example.com",
      customerPhone: null,
      dashboardUrl: "https://example.test/dashboard/bookings",
    });

    expect(html).toMatch(/no phone given/i);
  });
});

describe("bookingConfirmedEmail", () => {
  it("confirms the time, in the practice's timezone", () => {
    const { subject, html } = bookingConfirmedEmail(appointment);

    expect(subject).toMatch(/confirmed/i);
    expect(html).toContain("1:00 PM");
    expect(html).toContain("Routine cleaning");
  });
});

/**
 * A patient's name is free text from a public form, and it lands in an email
 * sent from the practice's own domain — the recipient has every reason to
 * trust it. Escaping is what stops a booking called
 * `<a href="...">Confirm</a>` becoming a working link in the practice's inbox.
 */
describe("escaping of patient-supplied values", () => {
  const HOSTILE = '<a href="https://evil.test">Confirm your appointment</a>';

  it("neutralises markup in the name on the practice's copy", () => {
    const { html } = bookingRequestNotificationEmail({
      ...appointment,
      customerName: HOSTILE,
      customerEmail: "jane@example.com",
      customerPhone: null,
      dashboardUrl: "https://example.test/dashboard/bookings",
    });

    expect(html).not.toContain('<a href="https://evil.test"');
    expect(html).toContain("&lt;a href=&quot;https://evil.test&quot;&gt;");
  });

  it("neutralises markup in every patient-facing template", () => {
    const hostile = { ...appointment, customerName: HOSTILE };

    for (const html of [
      bookingRequestReceivedEmail(hostile).html,
      bookingConfirmedEmail(hostile).html,
      bookingRescheduledEmail({ ...hostile, previousStartsAt: AFTERNOON, confirmed: true }).html,
    ]) {
      expect(html).not.toContain('evil.test">');
      expect(html).toContain("&lt;a");
    }
  });

  it("still renders an ordinary name unchanged", () => {
    // The fix must not turn "O'Brien" into "O&#39;Brien" in a real email... it
    // does, and that is correct: the entity renders as an apostrophe. What it
    // must not do is mangle plain ASCII names.
    expect(bookingConfirmedEmail({ ...appointment, customerName: "Jane Doe" }).html).toContain(
      "Hi Jane Doe,",
    );
  });
});

describe("bookingRescheduledEmail", () => {
  /**
   * Both times, always. "Your appointment has moved to Tuesday" is ambiguous
   * to someone with two appointments; showing what it moved *from* is what
   * removes the doubt.
   */
  it("shows the old time and the new one, and they differ", () => {
    const { html } = bookingRescheduledEmail({
      ...appointment,
      startsAt: NEXT_WEEK,
      previousStartsAt: AFTERNOON,
      confirmed: true,
    });

    expect(html).toContain("1:00 PM"); // was
    expect(html).toContain("10:00 AM"); // now
  });

  it("says whether the new time is agreed or still to be confirmed", () => {
    const moved = { ...appointment, startsAt: NEXT_WEEK, previousStartsAt: AFTERNOON };

    expect(bookingRescheduledEmail({ ...moved, confirmed: true }).html).toMatch(/confirmed/i);
    expect(bookingRescheduledEmail({ ...moved, confirmed: false }).html).toMatch(
      /call you back to confirm/i,
    );
  });
});
