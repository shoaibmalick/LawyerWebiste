import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/auth";
import { UnauthorizedError } from "@/lib/auth-guards";

/**
 * G2 — the access-control matrix from SECURITY_BASELINE.md, executed.
 *
 * Every admin-only surface is exercised against all three identities. The
 * middleware is deliberately **not** in the loop: `proxy.ts` is a redirect
 * convenience, and the whole point of this table is that each surface refuses
 * on its own. Next.js has a documented middleware-authorisation-bypass class
 * (CVE-2025-29927); a test that ran through the matcher would prove the
 * matcher works, not that the code behind it is safe without one.
 *
 * The customer row is the one that matters. Admin and customer share a single
 * Auth.js instance, so a signed-in customer holds a completely valid session —
 * any surface checking `if (!session)` rather than the role would admit them.
 */

const ADMIN = { user: { email: "admin@business.test", name: "Admin", role: "admin" } };
const CUSTOMER = { user: { email: "customer@example.com", name: "Pat", role: "customer" } };

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  signIn: vi.fn(),
  signOut: vi.fn(),
  handlers: {},
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ "x-forwarded-for": "203.0.113.5" })),
}));

/**
 * Keeps this file database-free.
 *
 * Every other entry in the table below is called with invalid input, so an
 * admin stops at `safeParse` and never reaches a query. `sendTestEmailAction`
 * takes no argument and so has nothing to fail on — for the admin identity it
 * goes straight through to reading the stored mail settings. Mocking that read
 * is what lets it be registered here rather than quietly omitted, and a missing
 * row is exactly the gap this matrix exists to catch.
 */
vi.mock("@/server/services/emailSettingsService", () => ({
  emailSettingsService: {
    getSettings: vi.fn(async () => ({ id: 1, provider: "SERVER" })),
    saveSettings: vi.fn(),
  },
}));

import {
  addBookingNoteAction,
  cancelBookingAction,
  confirmBookingAction,
  deleteAvailabilityAction,
  generateAvailabilityAction,
  getCallContextAction,
  getFollowUpWindow,
  listUpcomingAvailability,
  markBookingPaidAction,
  rescheduleBookingAction,
  setFollowUpWindowAction,
  saveStripeCredentialsAction,
  setPaymentTimingAction,
} from "@/features/booking";
import { getComposeContextAction, sendAdminEmailAction } from "@/features/admin-email";
import { listMyBookings } from "@/features/customer-accounts";
import { saveEmailSettingsAction, sendTestEmailAction } from "@/features/email-settings";
import { listAllLeads, markLeadHandledAction } from "@/features/leads";
import { approveReviewAction, deleteReviewAction, hideReviewAction } from "@/features/reviews";
import { setThemePresetAction } from "@/features/site-settings";
import { saveTeamAction } from "@/features/team";
import { requireAdmin } from "@/lib/auth-guards";
import { POST as teamPhotoPOST } from "./api/admin/team-photo/route";
import SettingsPage from "./(admin)/dashboard/settings/page";

function actAs(session: unknown) {
  vi.mocked(auth).mockResolvedValue(session as never);
}

/** Did the call refuse on authorisation grounds? */
async function refused(call: () => Promise<unknown>): Promise<boolean> {
  try {
    await call();
    return false;
  } catch (error) {
    return error instanceof UnauthorizedError;
  }
}

beforeEach(() => {
  vi.mocked(auth).mockReset();
  actAs(null);
});

// ---------------------------------------------------------------------------
// The guard itself
// ---------------------------------------------------------------------------

describe("requireAdmin asserts role, not session presence", () => {
  it("refuses anonymous", async () => {
    actAs(null);
    expect(await refused(requireAdmin)).toBe(true);
  });

  /** The stop-the-line case: a valid session that is not an admin one. */
  it("refuses a signed-in customer", async () => {
    actAs(CUSTOMER);
    expect(await refused(requireAdmin)).toBe(true);
  });

  it("admits an admin, and returns who they are", async () => {
    actAs(ADMIN);
    await expect(requireAdmin()).resolves.toEqual({
      email: "admin@business.test",
      name: "Admin",
    });
  });

  it("is not satisfied by a session with no role at all", async () => {
    actAs({ user: { email: "nobody@example.com" } });
    expect(await refused(requireAdmin)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Admin-only Server Actions — every mutating action, all three identities
// ---------------------------------------------------------------------------

describe("admin-only Server Actions", () => {
  /**
   * Each entry calls the action with deliberately invalid input. That is
   * enough: `requireAdmin()` is the first statement in every one, so an
   * authorisation refusal happens *before* the argument is ever parsed. An
   * admin therefore gets a validation failure rather than a throw, which is
   * itself proof the guard let them through.
   */
  const actions: [string, () => Promise<unknown>][] = [
    ["cancelBookingAction", async () => cancelBookingAction({})],
    ["confirmBookingAction", async () => confirmBookingAction({})],
    ["rescheduleBookingAction", async () => rescheduleBookingAction({})],
    ["addBookingNoteAction", async () => addBookingNoteAction({})],
    ["markBookingPaidAction", async () => markBookingPaidAction({})],
    ["getCallContextAction", async () => getCallContextAction({})],
    ["getFollowUpWindow", async () => getFollowUpWindow()],
    ["setFollowUpWindowAction", async () => setFollowUpWindowAction({})],
    ["generateAvailabilityAction", async () => generateAvailabilityAction({})],
    ["deleteAvailabilityAction", async () => deleteAvailabilityAction({})],
    ["listUpcomingAvailability", async () => listUpcomingAvailability()],
    ["setPaymentTimingAction", async () => setPaymentTimingAction("UPFRONT")],
    ["markLeadHandledAction", async () => markLeadHandledAction({})],
    ["listAllLeads", async () => listAllLeads({})],
    ["approveReviewAction", async () => approveReviewAction({})],
    ["hideReviewAction", async () => hideReviewAction({})],
    ["deleteReviewAction", async () => deleteReviewAction({})],
    ["saveTeamAction", async () => saveTeamAction({})],
    ["setThemePresetAction", async () => setThemePresetAction({})],
    ["saveStripeCredentialsAction", async () => saveStripeCredentialsAction({ bogus: true })],
    ["saveEmailSettingsAction", async () => saveEmailSettingsAction({})],
    ["sendTestEmailAction", async () => sendTestEmailAction()],
    ["getComposeContextAction", async () => getComposeContextAction({})],
    ["sendAdminEmailAction", async () => sendAdminEmailAction({})],
  ];

  describe.each(actions)("%s", (_name, call) => {
    it("refuses anonymous", async () => {
      actAs(null);
      expect(await refused(call)).toBe(true);
    });

    it("refuses a customer session", async () => {
      actAs(CUSTOMER);
      expect(await refused(call)).toBe(true);
    });

    it("admits an admin (reaches validation instead of throwing Unauthorized)", async () => {
      actAs(ADMIN);
      expect(await refused(call)).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Customer-scoped surface
// ---------------------------------------------------------------------------

describe("listMyBookings re-derives identity from the session", () => {
  it("takes no argument, so no caller can ask for another customer's history", async () => {
    expect(listMyBookings.length).toBe(0);
  });

  it("refuses anonymous", async () => {
    actAs(null);
    expect(await refused(() => listMyBookings())).toBe(true);
  });

  /**
   * An admin has a valid session but is not this customer. Reading someone's
   * history through the customer surface is a disclosure by the wrong route,
   * even though an admin may legitimately see it via /dashboard.
   */
  it("refuses an admin session", async () => {
    actAs(ADMIN);
    expect(await refused(() => listMyBookings())).toBe(true);
  });

  it("admits a customer", async () => {
    actAs(CUSTOMER);
    expect(await refused(() => listMyBookings())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Admin-only route handler (outside the middleware matcher entirely)
// ---------------------------------------------------------------------------

describe("POST /api/admin/team-photo", () => {
  async function upload() {
    const body = new FormData();
    body.append("file", new File([new Uint8Array([0xff, 0xd8, 0xff])], "x.jpg"));
    return teamPhotoPOST(
      new Request("http://localhost/api/admin/team-photo", { method: "POST", body }),
    );
  }

  it("401 for anonymous", async () => {
    actAs(null);
    expect((await upload()).status).toBe(401);
  });

  it("401 for a customer session", async () => {
    actAs(CUSTOMER);
    expect((await upload()).status).toBe(401);
  });

  it("does not 401 an admin", async () => {
    actAs(ADMIN);
    expect((await upload()).status).not.toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Admin pages guard themselves, not just via the middleware matcher
// ---------------------------------------------------------------------------

/**
 * /dashboard/settings is the sharpest case in the baseline. Three of its four
 * reads — getActiveTheme, listTeam, getPaymentSettings — carry no guard of
 * their own, so before this change the page rendered its contents to anyone
 * who reached it. Everything behind the matcher depended on the matcher.
 *
 * Only the two refusal identities are exercised. The admin path would need a
 * live database (the theme and roster reads call connection() and Prisma), and
 * this file deliberately has no database of its own — the refusal is the
 * property under test.
 */
describe("/dashboard/settings refuses on its own", () => {
  it("refuses anonymous without the middleware", async () => {
    actAs(null);
    expect(await refused(() => SettingsPage())).toBe(true);
  });

  it("refuses a signed-in customer", async () => {
    actAs(CUSTOMER);
    expect(await refused(() => SettingsPage())).toBe(true);
  });
});
