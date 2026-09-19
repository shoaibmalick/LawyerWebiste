import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { BookingStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  BookingContentionError,
  BookingNotConfirmableError,
  BookingNotReschedulableError,
  BookingSlotFullError,
  BookingSlotNotFoundError,
  bookingService,
  buildBookingWhere,
  MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL,
  TooManyActiveBookingsError,
  CAPACITY_HOLDING_STATUSES,
  SlotHasBookingsError,
} from "./bookingService";

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

async function createSlot(overrides: Partial<{ capacity: number; startsAt: Date }> = {}) {
  const startsAt = overrides.startsAt ?? hoursFromNow(24);
  return prisma.availabilitySlot.create({
    data: {
      startsAt,
      endsAt: new Date(startsAt.getTime() + 60 * 60 * 1000),
      capacity: overrides.capacity ?? 1,
    },
  });
}

/** A website booking — REQUESTED, the default. */
function book(slotId: string, customerEmail = "jane@example.com") {
  return bookingService.createBooking({
    serviceSlug: "test-service",
    slotId,
    customerName: "Jane",
    customerEmail,
  });
}

describe("bookingService", () => {
  beforeEach(async () => {
    await prisma.booking.deleteMany();
    await prisma.availabilitySlot.deleteMany();
  });

  afterAll(async () => {
    await prisma.booking.deleteMany();
    await prisma.availabilitySlot.deleteMany();
    await prisma.$disconnect();
  });

  describe("listAvailableSlots", () => {
    it("excludes slots in the past", async () => {
      await createSlot({ startsAt: new Date(Date.now() - 60 * 60 * 1000) });
      const slots = await bookingService.listAvailableSlots();
      expect(slots).toHaveLength(0);
    });

    it("excludes fully booked slots", async () => {
      const slot = await createSlot({ capacity: 1 });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "A",
        customerEmail: "a@example.com",
      });
      const slots = await bookingService.listAvailableSlots();
      expect(slots).toHaveLength(0);
    });

    it("reports remaining capacity for a partially booked slot", async () => {
      const slot = await createSlot({ capacity: 3 });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "A",
        customerEmail: "a@example.com",
      });
      const slots = await bookingService.listAvailableSlots();
      expect(slots).toHaveLength(1);
      expect(slots[0].remainingCapacity).toBe(2);
    });
  });

  describe("createBooking", () => {
    it("creates a REQUESTED booking by default — a website booking is a request", async () => {
      // The practice rings the patient and confirms. Until then it is a
      // request, and the receptionist owns the decision.
      const slot = await createSlot();
      const booking = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
      });
      expect(booking.status).toBe("REQUESTED");
      expect(booking.slot.id).toBe(slot.id);
    });

    it("creates a PENDING_PAYMENT booking when requested", async () => {
      const slot = await createSlot();
      const booking = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
        status: "PENDING_PAYMENT",
      });
      expect(booking.status).toBe("PENDING_PAYMENT");
    });

    it("throws BookingSlotNotFoundError for a nonexistent slot", async () => {
      await expect(
        bookingService.createBooking({
          slotId: "does-not-exist",
          serviceSlug: "test-service",
          customerName: "Jane",
          customerEmail: "jane@example.com",
        }),
      ).rejects.toThrow(BookingSlotNotFoundError);
    });

    it("throws BookingSlotFullError once capacity is exhausted", async () => {
      const slot = await createSlot({ capacity: 1 });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "First",
        customerEmail: "first@example.com",
      });

      await expect(
        bookingService.createBooking({
          slotId: slot.id,
          serviceSlug: "test-service",
          customerName: "Second",
          customerEmail: "second@example.com",
        }),
      ).rejects.toThrow(BookingSlotFullError);
    });

    it("allows bookings up to capacity for multi-seat slots (e.g. a class)", async () => {
      const slot = await createSlot({ capacity: 2 });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "First",
        customerEmail: "first@example.com",
      });
      const second = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Second",
        customerEmail: "second@example.com",
      });
      expect(second.status).toBe("REQUESTED");

      await expect(
        bookingService.createBooking({
          slotId: slot.id,
          serviceSlug: "test-service",
          customerName: "Third",
          customerEmail: "third@example.com",
        }),
      ).rejects.toThrow(BookingSlotFullError);
    });

    it("does not count a cancelled booking against capacity", async () => {
      const slot = await createSlot({ capacity: 1 });
      const first = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "First",
        customerEmail: "first@example.com",
      });
      await bookingService.cancelBooking(first.id);

      const second = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Second",
        customerEmail: "second@example.com",
      });
      expect(second.status).toBe("REQUESTED");
    });

    it("counts a PENDING_PAYMENT booking against capacity — an unpaid hold is still a chair", async () => {
      // This assertion used to be the opposite, and the comment called it a
      // deliberate simplification. It stopped being defensible once a website
      // booking became a request the receptionist rings about: "an unpaid
      // booking doesn't hold the chair, but one nobody has called about does"
      // is not a rule anyone could explain to the practice. The rule is now
      // simply that a booking holds the chair unless it was cancelled.
      const slot = await createSlot({ capacity: 1 });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "First",
        customerEmail: "first@example.com",
        status: "PENDING_PAYMENT",
      });

      await expect(
        bookingService.createBooking({
          serviceSlug: "test-service",
          slotId: slot.id,
          customerName: "Second",
          customerEmail: "second@example.com",
        }),
      ).rejects.toThrow(BookingSlotFullError);
    });

    /**
     * Every status, classified deliberately.
     *
     * Adding a member to the Prisma enum without adding it here fails this
     * test, which is the entire point: capacity used to be spelled out at four
     * call sites — two as a whitelist of CONFIRMED, two as "anything but
     * CANCELLED" — and a status added without touching all four silently
     * enabled unlimited double-booking.
     */
    const HOLDS_A_CHAIR: Record<BookingStatus, boolean> = {
      REQUESTED: true,
      CONFIRMED: true,
      PENDING_PAYMENT: true,
      CANCELLED: false,
    };

    it("classifies every BookingStatus", () => {
      expect(Object.keys(HOLDS_A_CHAIR).sort()).toEqual(Object.values(BookingStatus).sort());
      expect([...CAPACITY_HOLDING_STATUSES].sort()).toEqual(
        Object.entries(HOLDS_A_CHAIR)
          .filter(([, holds]) => holds)
          .map(([status]) => status)
          .sort(),
      );
    });

    // The table above is only worth having if the database agrees with it, so
    // it drives real assertions rather than only checking itself.
    for (const [status, holds] of Object.entries(HOLDS_A_CHAIR)) {
      it(`${status} ${holds ? "blocks" : "leaves free"} a capacity-1 slot`, async () => {
        const slot = await createSlot({ capacity: 1 });
        const first = await bookingService.createBooking({
          serviceSlug: "test-service",
          slotId: slot.id,
          customerName: "First",
          customerEmail: "first@example.com",
          // CANCELLED cannot be created directly, so reach it the way the app
          // does — create then cancel.
          ...(status === "CANCELLED" ? {} : { status: status as "REQUESTED" }),
        });
        if (status === "CANCELLED") {
          await bookingService.cancelBooking(first.id);
        }

        const second = bookingService.createBooking({
          serviceSlug: "test-service",
          slotId: slot.id,
          customerName: "Second",
          customerEmail: "second@example.com",
        });

        if (holds) {
          await expect(second).rejects.toThrow(BookingSlotFullError);
        } else {
          await expect(second).resolves.toBeTruthy();
        }
      });
    }
  });

  describe("confirmBookingPayment", () => {
    it("confirms a PENDING_PAYMENT booking and marks it paid", async () => {
      const slot = await createSlot();
      const booking = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
        status: "PENDING_PAYMENT",
      });
      await bookingService.attachCheckoutSession(booking.id, "cs_test_123");

      const confirmed = await bookingService.confirmBookingPayment("cs_test_123");
      expect(confirmed?.status).toBe("CONFIRMED");
      expect(confirmed?.paid).toBe(true);
    });

    it("is idempotent — a second call with the same session id is a no-op", async () => {
      const slot = await createSlot();
      const booking = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
        status: "PENDING_PAYMENT",
      });
      await bookingService.attachCheckoutSession(booking.id, "cs_test_456");

      await bookingService.confirmBookingPayment("cs_test_456");
      const secondCall = await bookingService.confirmBookingPayment("cs_test_456");
      expect(secondCall).toBeNull();
    });

    it("returns null for an unknown session id", async () => {
      const result = await bookingService.confirmBookingPayment("cs_unknown");
      expect(result).toBeNull();
    });
  });

  describe("confirmation email tracking", () => {
    it("starts unsent and records when it is sent", async () => {
      const slot = await createSlot();
      const booking = await bookingService.createBooking({
        slotId: slot.id,
        serviceSlug: "test-service",
        customerName: "Jane",
        customerEmail: "jane@example.com",
      });

      expect(booking.confirmationEmailSentAt).toBeNull();

      const updated = await bookingService.markConfirmationEmailSent(booking.id);
      expect(updated.confirmationEmailSentAt).toBeInstanceOf(Date);
    });

    /**
     * The gap this closes. confirmBookingPayment returns null once a booking is
     * already confirmed — correct for idempotency, but it also meant a webhook
     * retry could not reach the booking to finish an email that had failed, so
     * a customer who had paid was never told.
     */
    it("is still reachable by session id after it has been confirmed", async () => {
      const slot = await createSlot();
      const booking = await bookingService.createBooking({
        slotId: slot.id,
        serviceSlug: "test-service",
        customerName: "Jane",
        customerEmail: "jane@example.com",
        status: "PENDING_PAYMENT",
      });
      await bookingService.attachCheckoutSession(booking.id, "cs_retry_1");

      await bookingService.confirmBookingPayment("cs_retry_1");
      // A redelivery: the status change is a no-op...
      expect(await bookingService.confirmBookingPayment("cs_retry_1")).toBeNull();

      // ...but the booking is still findable, so the email can be retried.
      const found = await bookingService.findBookingByCheckoutSession("cs_retry_1");
      expect(found?.id).toBe(booking.id);
      expect(found?.status).toBe("CONFIRMED");
      expect(found?.confirmationEmailSentAt).toBeNull();
    });

    it("returns null for an unknown session id", async () => {
      expect(await bookingService.findBookingByCheckoutSession("cs_nope")).toBeNull();
    });
  });

  describe("markPaid", () => {
    it("sets paid to true", async () => {
      const slot = await createSlot();
      const booking = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
      });
      expect(booking.paid).toBe(false);

      const updated = await bookingService.markPaid(booking.id);
      expect(updated.paid).toBe(true);
    });
  });

  /**
   * G9.4 — a cap on how many future appointments one person can hold.
   *
   * Slot ids are public via GET /api/booking/slots, so without a cap one
   * script can hold every chair the practice has published. The receptionist
   * then rings a list of appointments that do not exist, and real patients see
   * no availability at all. That is a denial of service against the
   * appointment book rather than against the server.
   *
   * Counted per email rather than per IP. The email is already stored; an IP
   * is not, and adding one would introduce a new piece of personal data to
   * every booking row — see docs/PRIVACY_POSTURE.md, which states plainly that
   * we do not retain visitor IPs. The per-source limit stays in the rate
   * limiter where it belongs.
   */
  describe("active future booking cap", () => {
    async function bookFor(email: string, hoursAhead: number) {
      const slot = await createSlot({ startsAt: hoursFromNow(hoursAhead) });
      return bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Jane",
        customerEmail: email,
      });
    }

    it("allows a patient up to the cap", async () => {
      for (let i = 1; i <= MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL; i += 1) {
        await expect(bookFor("jane@example.com", 24 * i)).resolves.toBeTruthy();
      }
    });

    it("refuses the one after that, with an error the route can translate", async () => {
      for (let i = 1; i <= MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL; i += 1) {
        await bookFor("jane@example.com", 24 * i);
      }

      await expect(bookFor("jane@example.com", 24 * 20)).rejects.toThrow(
        TooManyActiveBookingsError,
      );
    });

    it("counts per patient, so one person cannot block another", async () => {
      for (let i = 1; i <= MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL; i += 1) {
        await bookFor("jane@example.com", 24 * i);
      }

      await expect(bookFor("someone-else@example.com", 24 * 30)).resolves.toBeTruthy();
    });

    it("matches the patient however they capitalised their address", async () => {
      // createBookingSchema lower-cases on write, but the service is called
      // directly by staff paths too — the cap must not be evaded by casing.
      for (let i = 1; i <= MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL; i += 1) {
        await bookFor("jane@example.com", 24 * i);
      }

      await expect(bookFor("JANE@example.com", 24 * 40)).rejects.toThrow(
        TooManyActiveBookingsError,
      );
    });

    it("does not count cancelled bookings against the cap", async () => {
      const first = await bookFor("jane@example.com", 24);
      for (let i = 2; i <= MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL; i += 1) {
        await bookFor("jane@example.com", 24 * i);
      }
      await bookingService.cancelBooking(first.id);

      // A patient who cancelled should be able to rebook.
      await expect(bookFor("jane@example.com", 24 * 50)).resolves.toBeTruthy();
    });

    it("does not count appointments that have already happened", async () => {
      // Past appointments are history, not a held chair.
      for (let i = 1; i <= MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL; i += 1) {
        const slot = await prisma.availabilitySlot.create({
          data: {
            startsAt: hoursFromNow(-24 * i),
            endsAt: hoursFromNow(-24 * i + 1),
            capacity: 1,
          },
        });
        await bookingService.createBooking({
          serviceSlug: "test-service",
          slotId: slot.id,
          customerName: "Jane",
          customerEmail: "jane@example.com",
        });
      }

      await expect(bookFor("jane@example.com", 24)).resolves.toBeTruthy();
    });
  });

  describe("listBookingsByEmail", () => {
    it("only returns bookings for the given email", async () => {
      const slot = await createSlot({ capacity: 2 });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
      });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: slot.id,
        customerName: "Bob",
        customerEmail: "bob@example.com",
      });

      const janeBookings = await bookingService.listBookingsByEmail("jane@example.com");
      expect(janeBookings).toHaveLength(1);
      expect(janeBookings[0].customerEmail).toBe("jane@example.com");
    });
  });

  // The bug this model change exists to fix. Slots used to carry a serviceSlug,
  // so a single 9am opening existed once per service and capacity was counted
  // per row — a one-chair practice offering nine services could be booked nine
  // times for the same moment. A slot is now a unit of the business's time.
  describe("one chair at a time", () => {
    it("refuses a second booking at the same instant, whatever the service", async () => {
      const slot = await createSlot({ capacity: 1 });

      await bookingService.createBooking({
        slotId: slot.id,
        serviceSlug: "teeth-whitening",
        customerName: "First",
        customerEmail: "first@example.com",
      });

      await expect(
        bookingService.createBooking({
          slotId: slot.id,
          // A different treatment entirely — under the old model this was a
          // different row and therefore succeeded.
          serviceSlug: "dental-implants",
          customerName: "Second",
          customerEmail: "second@example.com",
        }),
      ).rejects.toThrow(BookingSlotFullError);
    });

    it("cannot store two slots at the same instant", async () => {
      const startsAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

      const first = await bookingService.createSlots([{ startsAt, endsAt }], 1);
      const second = await bookingService.createSlots([{ startsAt, endsAt }], 1);

      expect(first).toEqual({ created: 1, skipped: 0 });
      // Enforced by a unique index, not by convention — the duplicate cannot
      // exist even if some future caller forgets to check.
      expect(second).toEqual({ created: 0, skipped: 1 });
      expect(await prisma.availabilitySlot.count()).toBe(1);
    });
  });

  // Four people clicking the same time at once is ordinary, not exotic. The
  // serializable isolation that makes capacity trustworthy also makes those
  // transactions abort each other; without a retry those aborts reached the
  // customer as HTTP 500s while the booking itself was fine.
  describe("concurrent bookings for one slot", () => {
    it("gives exactly one winner and a clean refusal to the rest", async () => {
      const slot = await createSlot({ capacity: 1 });

      const results = await Promise.allSettled(
        [1, 2, 3, 4].map((i) =>
          bookingService.createBooking({
            slotId: slot.id,
            serviceSlug: "test-service",
            customerName: `Racer ${i}`,
            customerEmail: `racer${i}@example.com`,
          }),
        ),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(await prisma.booking.count()).toBe(1);

      // Every loser must fail with an error the API can turn into something
      // useful — full (409) or contention (503, retry). A raw driver error
      // escaping here is the HTTP 500 this guards against.
      for (const result of rejected) {
        const reason = (result as PromiseRejectedResult).reason;
        const usable =
          reason instanceof BookingSlotFullError || reason instanceof BookingContentionError;
        expect(usable, `unexpected error type: ${reason?.name} ${reason?.message}`).toBe(true);
      }
    });
  });

  describe("createSlots", () => {
    const at = (hoursFromNow: number) => new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);

    function slot(hoursFromNow: number) {
      return { startsAt: at(hoursFromNow), endsAt: at(hoursFromNow + 1) };
    }

    it("inserts new slots with the requested capacity", async () => {
      const result = await bookingService.createSlots([slot(24), slot(25)], 3);

      expect(result).toEqual({ created: 2, skipped: 0 });
      const rows = await prisma.availabilitySlot.findMany();
      expect(rows).toHaveLength(2);
      expect(rows.every((row) => row.capacity === 3)).toBe(true);
    });

    // Re-running the same generation is an ordinary mistake, and must not
    // silently double the practice's apparent capacity.
    it("skips slots that already exist for the same service and time", async () => {
      const first = slot(24);
      await bookingService.createSlots([first], 1);

      const result = await bookingService.createSlots([first, slot(26)], 1);

      expect(result).toEqual({ created: 1, skipped: 1 });
      expect(await prisma.availabilitySlot.count()).toBe(2);
    });

    it("treats a different instant as a distinct slot", async () => {
      await bookingService.createSlots([slot(24)], 1);

      const result = await bookingService.createSlots([slot(25)], 1);

      expect(result).toEqual({ created: 1, skipped: 0 });
      expect(await prisma.availabilitySlot.count()).toBe(2);
    });

    it("is a no-op for an empty list", async () => {
      expect(await bookingService.createSlots([], 1)).toEqual({ created: 0, skipped: 0 });
    });
  });

  describe("deleteSlot", () => {
    it("removes a slot nobody has booked", async () => {
      const created = await createSlot();

      await bookingService.deleteSlot(created.id);

      expect(await prisma.availabilitySlot.count()).toBe(0);
    });

    // Booking.slotId is a required relation with no cascade, so deleting a
    // booked slot would fail at the database or orphan a real appointment.
    it("refuses while an active booking references it", async () => {
      const created = await createSlot();
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: created.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
      });

      await expect(bookingService.deleteSlot(created.id)).rejects.toThrow(SlotHasBookingsError);
      expect(await prisma.availabilitySlot.count()).toBe(1);
    });

    it("allows deletion once the booking is cancelled", async () => {
      const created = await createSlot();
      const booking = await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: created.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
      });
      await bookingService.cancelBooking(booking.id);

      await bookingService.deleteSlot(created.id);

      expect(await prisma.availabilitySlot.count()).toBe(0);
    });

    it("throws for a slot that does not exist", async () => {
      await expect(bookingService.deleteSlot("nope")).rejects.toThrow(BookingSlotNotFoundError);
    });
  });

  describe("listUpcomingSlots", () => {
    it("excludes past slots and reports active bookings", async () => {
      await createSlot({ startsAt: new Date(Date.now() - 60 * 60 * 1000) });
      const upcoming = await createSlot({ startsAt: new Date(Date.now() + 60 * 60 * 1000) });
      await bookingService.createBooking({
        serviceSlug: "test-service",
        slotId: upcoming.id,
        customerName: "Jane",
        customerEmail: "jane@example.com",
      });

      const { slots: rows, total } = await bookingService.listUpcomingSlots();

      expect(total).toBe(1);
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(upcoming.id);
      expect(rows[0].activeBookings).toBe(1);
    });
  });
  describe("confirmBooking", () => {
    it("turns a request into a confirmed appointment", async () => {
      const slot = await createSlot();
      const booking = await book(slot.id);

      expect((await bookingService.confirmBooking(booking.id)).status).toBe("CONFIRMED");
    });

    it("is safe to confirm twice", async () => {
      const slot = await createSlot();
      const booking = await book(slot.id);

      await bookingService.confirmBooking(booking.id);
      expect((await bookingService.confirmBooking(booking.id)).status).toBe("CONFIRMED");
    });

    it("refuses a cancelled booking rather than reinstating it", async () => {
      const slot = await createSlot();
      const booking = await book(slot.id);
      await bookingService.cancelBooking(booking.id);

      await expect(bookingService.confirmBooking(booking.id)).rejects.toThrow(
        BookingNotConfirmableError,
      );
    });

    it("does not change how many chairs are held", async () => {
      // REQUESTED and CONFIRMED both hold, so confirming can neither free nor
      // take a chair. That is what makes it safe outside a transaction.
      const slot = await createSlot({ capacity: 1 });
      const booking = await book(slot.id);
      expect(await bookingService.listAvailableSlots()).toHaveLength(0);

      await bookingService.confirmBooking(booking.id);

      expect(await bookingService.listAvailableSlots()).toHaveLength(0);
    });
  });

  describe("rescheduleBooking", () => {
    it("moves the booking, freeing the old slot and holding the new one", async () => {
      const from = await createSlot({ startsAt: hoursFromNow(24) });
      const to = await createSlot({ startsAt: hoursFromNow(48) });
      const booking = await book(from.id);

      const result = await bookingService.rescheduleBooking({
        bookingId: booking.id,
        target: { kind: "slot", slotId: to.id },
        confirm: false,
      });

      expect(result.booking.slotId).toBe(to.id);
      expect(result.moved).toBe(true);
      const open = (await bookingService.listAvailableSlots()).map((s) => s.id);
      expect(open).toContain(from.id);
      expect(open).not.toContain(to.id);
    });

    it("treats a move into its own slot as a no-op, not a full slot", async () => {
      // The self-count trap: at capacity 1, counting the booking being moved
      // against its own target reports "full" for EVERY same-slot move.
      const slot = await createSlot({ capacity: 1 });
      const booking = await book(slot.id);

      const result = await bookingService.rescheduleBooking({
        bookingId: booking.id,
        target: { kind: "slot", slotId: slot.id },
        confirm: true,
      });

      expect(result.moved).toBe(false);
      expect(result.booking.status).toBe("CONFIRMED");
    });

    it("confirms in the same move when asked, and leaves the status alone when not", async () => {
      const from = await createSlot({ startsAt: hoursFromNow(24) });
      const to = await createSlot({ startsAt: hoursFromNow(48) });
      const other = await createSlot({ startsAt: hoursFromNow(72) });

      const a = await book(from.id);
      expect(
        (
          await bookingService.rescheduleBooking({
            bookingId: a.id,
            target: { kind: "slot", slotId: to.id },
            confirm: true,
          })
        ).booking.status,
      ).toBe("CONFIRMED");

      const b = await book(from.id);
      expect(
        (
          await bookingService.rescheduleBooking({
            bookingId: b.id,
            target: { kind: "slot", slotId: other.id },
            confirm: false,
          })
        ).booking.status,
      ).toBe("REQUESTED");
    });

    it("refuses a full slot and leaves the booking where it was", async () => {
      // The booking must never be lost by a rejected move.
      const from = await createSlot({ startsAt: hoursFromNow(24) });
      const full = await createSlot({ startsAt: hoursFromNow(48), capacity: 1 });
      const booking = await book(from.id);
      await book(full.id, "occupant@example.com");

      await expect(
        bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "slot", slotId: full.id },
          confirm: false,
        }),
      ).rejects.toThrow(BookingSlotFullError);

      const after = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
      expect(after.slotId).toBe(from.id);
    });

    it("refuses a cancelled booking rather than silently reinstating it", async () => {
      const from = await createSlot({ startsAt: hoursFromNow(24) });
      const to = await createSlot({ startsAt: hoursFromNow(48) });
      const booking = await book(from.id);
      await bookingService.cancelBooking(booking.id);

      await expect(
        bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "slot", slotId: to.id },
          confirm: true,
        }),
      ).rejects.toThrow(BookingNotReschedulableError);
    });

    describe("the override", () => {
      it("creates a slot at a time the practice does not normally offer", async () => {
        const from = await createSlot({ startsAt: hoursFromNow(24) });
        const booking = await book(from.id);
        const sunday = hoursFromNow(96);

        const result = await bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "override", startsAt: sunday, endsAt: hoursFromNow(97) },
          confirm: true,
        });

        const created = await prisma.availabilitySlot.findUniqueOrThrow({
          where: { startsAt: sunday },
        });
        expect(result.booking.slotId).toBe(created.id);
        expect(created.createdByOverride).toBe(true);
      });

      it("reuses an existing slot at that instant instead of making a second chair", async () => {
        // AvailabilitySlot.startsAt is @unique, which is what makes the upsert
        // possible AND what makes it necessary — without it the override would
        // manufacture a parallel chair and double-book the practice.
        const from = await createSlot({ startsAt: hoursFromNow(24) });
        const existing = await createSlot({ startsAt: hoursFromNow(48), capacity: 1 });
        const booking = await book(from.id);

        await bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "override", startsAt: existing.startsAt, endsAt: existing.endsAt },
          confirm: false,
        });

        expect(await prisma.availabilitySlot.count()).toBe(2);
        const reused = await prisma.availabilitySlot.findUniqueOrThrow({
          where: { id: existing.id },
        });
        expect(reused.createdByOverride).toBe(false);
        expect(reused.capacity).toBe(1);
      });

      it("respects the capacity of a slot it reused", async () => {
        const from = await createSlot({ startsAt: hoursFromNow(24) });
        const taken = await createSlot({ startsAt: hoursFromNow(48), capacity: 1 });
        await book(taken.id, "occupant@example.com");
        const booking = await book(from.id);

        await expect(
          bookingService.rescheduleBooking({
            bookingId: booking.id,
            target: { kind: "override", startsAt: taken.startsAt, endsAt: taken.endsAt },
            confirm: false,
          }),
        ).rejects.toThrow(BookingSlotFullError);
      });

      it("disappears when the booking moves away, so it never becomes public", async () => {
        // Otherwise "squeeze her in Sunday at 7pm" leaves a bookable Sunday
        // evening the moment that booking moves, and a stranger takes it.
        const from = await createSlot({ startsAt: hoursFromNow(24) });
        const back = await createSlot({ startsAt: hoursFromNow(72) });
        const booking = await book(from.id);
        const sunday = hoursFromNow(96);

        await bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "override", startsAt: sunday, endsAt: hoursFromNow(97) },
          confirm: true,
        });
        await bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "slot", slotId: back.id },
          confirm: true,
        });

        expect(
          await prisma.availabilitySlot.findUnique({ where: { startsAt: sunday } }),
        ).toBeNull();
      });

      it("disappears when the booking on it is cancelled", async () => {
        const from = await createSlot({ startsAt: hoursFromNow(24) });
        const booking = await book(from.id);
        const sunday = hoursFromNow(96);

        await bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "override", startsAt: sunday, endsAt: hoursFromNow(97) },
          confirm: true,
        });
        await bookingService.cancelBooking(booking.id);

        expect(
          await prisma.availabilitySlot.findUnique({ where: { startsAt: sunday } }),
        ).toBeNull();
      });

      it("never deletes a slot the practice generated itself", async () => {
        // Emptying a normal slot is how availability is meant to work.
        const slot = await createSlot({ startsAt: hoursFromNow(24) });
        const booking = await book(slot.id);

        await bookingService.cancelBooking(booking.id);

        expect(await prisma.availabilitySlot.findUnique({ where: { id: slot.id } })).not.toBeNull();
      });
    });

    it("survives racing the public booking path for the last seat", async () => {
      // A reschedule and four website bookings all going for one chair. The
      // guarantee is: exactly one occupant, and never a raw driver error
      // escaping as an HTTP 500.
      const from = await createSlot({ startsAt: hoursFromNow(24) });
      const contested = await createSlot({ startsAt: hoursFromNow(48), capacity: 1 });
      const booking = await book(from.id);

      const attempts = await Promise.allSettled([
        bookingService.rescheduleBooking({
          bookingId: booking.id,
          target: { kind: "slot", slotId: contested.id },
          confirm: true,
        }),
        ...Array.from({ length: 4 }, (_, i) =>
          bookingService.createBooking({
            serviceSlug: "test-service",
            slotId: contested.id,
            customerName: `Racer ${i}`,
            customerEmail: `racer${i}@example.com`,
          }),
        ),
      ]);

      const held = await prisma.booking.count({
        where: { slotId: contested.id, status: { in: [...CAPACITY_HOLDING_STATUSES] } },
      });
      expect(held).toBe(1);

      for (const attempt of attempts) {
        if (attempt.status === "rejected") {
          expect(
            attempt.reason instanceof BookingSlotFullError ||
              attempt.reason instanceof BookingContentionError,
          ).toBe(true);
        }
      }
    });
  });

  describe("booking notes", () => {
    it("records what was said, newest first, with the author", async () => {
      const slot = await createSlot();
      const booking = await book(slot.id);

      await bookingService.addBookingNote({
        bookingId: booking.id,
        outcome: "NO_ANSWER",
        body: "Rang twice",
        authorEmail: "reception@clinic.test",
        authorName: "Reception",
      });
      await new Promise((resolve) => setTimeout(resolve, 5));
      await bookingService.addBookingNote({ bookingId: booking.id, outcome: "SPOKE_TO_PATIENT" });

      const notes = await bookingService.listBookingNotes(booking.id);
      expect(notes.map((n) => n.outcome)).toEqual(["SPOKE_TO_PATIENT", "NO_ANSWER"]);
      expect(notes[1].authorName).toBe("Reception");
      expect(notes[1].body).toBe("Rang twice");
    });

    it("never changes the booking's status", async () => {
      const slot = await createSlot();
      const booking = await book(slot.id);

      await bookingService.addBookingNote({ bookingId: booking.id, outcome: "SPOKE_TO_PATIENT" });

      const after = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
      expect(after.status).toBe("REQUESTED");
    });

    it("is deleted along with the booking when a slot is removed", async () => {
      // The FK trap: deleteSlot removes CANCELLED bookings, and without
      // onDelete: Cascade a note holding the key would block that delete.
      const slot = await createSlot();
      const booking = await book(slot.id);
      await bookingService.addBookingNote({ bookingId: booking.id, outcome: "NOTE", body: "x" });
      await bookingService.cancelBooking(booking.id);

      await bookingService.deleteSlot(slot.id);

      expect(await prisma.bookingNote.count()).toBe(0);
    });
  });

  describe("buildBookingWhere", () => {
    it("is empty when nothing is filtered", () => {
      expect(buildBookingWhere({})).toEqual({});
    });

    it("ORs the search box across name, email and phone", () => {
      // One box, not three: a receptionist has one identifier in hand and does
      // not know which column it is in.
      const where = buildBookingWhere({ q: "priya" });
      expect(where.OR).toHaveLength(3);
    });

    it("nests the date range through the slot relation", () => {
      const from = new Date("2026-08-10T04:00:00.000Z");
      const to = new Date("2026-08-11T04:00:00.000Z");

      expect(buildBookingWhere({ from, to })).toEqual({
        // `lt`, not `lte` — `to` is already the next midnight, so a range
        // ending on the appointment's own day still finds it.
        slot: { startsAt: { gte: from, lt: to } },
      });
    });
  });

  describe("listAllBookings", () => {
    it("counts the matches and the whole table separately", async () => {
      const slot = await createSlot({ startsAt: hoursFromNow(24) });
      const other = await createSlot({ startsAt: hoursFromNow(48) });
      const confirmed = await book(slot.id, "one@example.com");
      await book(other.id, "two@example.com");
      await bookingService.confirmBooking(confirmed.id);

      const result = await bookingService.listAllBookings({ status: "REQUESTED" });

      expect(result.matching).toBe(1);
      expect(result.total).toBe(2);
      expect(result.statusCounts).toMatchObject({ REQUESTED: 1, CONFIRMED: 1, all: 2 });
    });

    it("finds a booking beyond the page cap by searching", async () => {
      // Filtering must happen in the query. Over the fetched rows it would
      // search only the most recent page, and a receptionist searching a
      // patient's email would conclude they had never booked.
      const older = await createSlot({ startsAt: hoursFromNow(24) });
      const newer = await createSlot({ startsAt: hoursFromNow(48) });
      await book(older.id, "ancient@example.com");
      await new Promise((resolve) => setTimeout(resolve, 5));
      await book(newer.id, "recent@example.com");

      const capped = await bookingService.listAllBookings({}, "all", 1);
      expect(capped.bookings.map((b) => b.customerEmail)).toEqual(["recent@example.com"]);

      const found = await bookingService.listAllBookings({ q: "ancient" }, "all", 1);
      expect(found.bookings.map((b) => b.customerEmail)).toEqual(["ancient@example.com"]);
      expect(found.matching).toBe(1);
    });

    it("orders a work queue by appointment time and the archive by when it came in", async () => {
      const soon = await createSlot({ startsAt: hoursFromNow(24) });
      const later = await createSlot({ startsAt: hoursFromNow(72) });
      // Booked in the opposite order to the appointments themselves.
      await book(later.id, "later@example.com");
      await new Promise((resolve) => setTimeout(resolve, 5));
      await book(soon.id, "soon@example.com");

      const queue = await bookingService.listAllBookings({}, "requests");
      expect(queue.bookings.map((b) => b.customerEmail)).toEqual([
        "soon@example.com",
        "later@example.com",
      ]);

      const archive = await bookingService.listAllBookings({}, "all");
      expect(archive.bookings.map((b) => b.customerEmail)).toEqual([
        "soon@example.com",
        "later@example.com",
      ]);
    });

    /**
     * The reported bug, and the reason it was so easy to miss.
     *
     * The where clause was `{ ...buildBookingWhere(filters), ...VIEW_WHERE[view] }`.
     * Spreading the view *after* the filters meant the view's `status`
     * overwrote the one the receptionist had just chosen — silently, with no
     * error and no empty state, so the page came back looking identical and
     * the control appeared dead.
     *
     * It worked on "all" purely by accident: that view's clause is `{}`, which
     * contributes no `status` key to overwrite anything. Which is exactly the
     * pattern that was reported — broken on Requests and Upcoming, fine on All.
     */
    describe("the status filter composes with the view instead of being overwritten", () => {
      async function seedOneOfEach() {
        const a = await createSlot({ startsAt: hoursFromNow(24) });
        const b = await createSlot({ startsAt: hoursFromNow(48) });
        const c = await createSlot({ startsAt: hoursFromNow(72) });

        await book(a.id, "requested@example.com");
        const confirmed = await book(b.id, "confirmed@example.com");
        await bookingService.confirmBooking(confirmed.id);
        const cancelled = await book(c.id, "cancelled@example.com");
        await bookingService.cancelBooking(cancelled.id);
      }

      it("narrows within the Upcoming view rather than ignoring the choice", async () => {
        await seedOneOfEach();

        const unfiltered = await bookingService.listAllBookings({}, "upcoming");
        expect(unfiltered.bookings.map((b) => b.customerEmail).sort()).toEqual([
          "confirmed@example.com",
          "requested@example.com",
        ]);

        // Before the fix this returned both rows — the view's `status in [...]`
        // overwrote `status: CONFIRMED` entirely.
        const narrowed = await bookingService.listAllBookings({ status: "CONFIRMED" }, "upcoming");
        expect(narrowed.bookings.map((b) => b.customerEmail)).toEqual(["confirmed@example.com"]);
        expect(narrowed.matching).toBe(1);
      });

      it("returns nothing when the chosen status is outside the view", async () => {
        await seedOneOfEach();

        // Honest: the Requests tab is REQUESTED-only, so asking it for
        // CONFIRMED has no answer. Before the fix this showed the REQUESTED
        // row, which is the opposite of what was asked for.
        const impossible = await bookingService.listAllBookings(
          { status: "CONFIRMED" },
          "requests",
        );
        expect(impossible.bookings).toHaveLength(0);
        expect(impossible.matching).toBe(0);
      });

      it("still filters correctly on the All view", async () => {
        await seedOneOfEach();

        const cancelled = await bookingService.listAllBookings({ status: "CANCELLED" }, "all");
        expect(cancelled.bookings.map((b) => b.customerEmail)).toEqual(["cancelled@example.com"]);
      });

      it("keeps the other filters working alongside the view", async () => {
        await seedOneOfEach();

        const found = await bookingService.listAllBookings({ q: "confirmed@" }, "upcoming");
        expect(found.bookings.map((b) => b.customerEmail)).toEqual(["confirmed@example.com"]);
      });
    });
  });

  describe("listBookingsForFollowUp", () => {
    it("splits requests from confirmed, and excludes anything outside the window", async () => {
      const inside = await createSlot({ startsAt: hoursFromNow(24) });
      const alsoInside = await createSlot({ startsAt: hoursFromNow(48) });
      const outside = await createSlot({ startsAt: hoursFromNow(24 * 10) });

      await book(inside.id, "needs-call@example.com");
      const confirmed = await book(alsoInside.id, "confirmed@example.com");
      await bookingService.confirmBooking(confirmed.id);
      await book(outside.id, "far-away@example.com");

      const result = await bookingService.listBookingsForFollowUp(5);

      expect(result.needsCall.map((b) => b.customerEmail)).toEqual(["needs-call@example.com"]);
      expect(result.upcoming.map((b) => b.customerEmail)).toEqual(["confirmed@example.com"]);
      expect(result.needsCallTotal).toBe(1);
      expect(result.upcomingTotal).toBe(1);
    });

    it("honours the configured window", async () => {
      const slot = await createSlot({ startsAt: hoursFromNow(24 * 4) });
      await book(slot.id);

      expect((await bookingService.listBookingsForFollowUp(5)).needsCall).toHaveLength(1);
      expect((await bookingService.listBookingsForFollowUp(1)).needsCall).toHaveLength(0);
    });

    it("leaves out cancelled appointments", async () => {
      const slot = await createSlot({ startsAt: hoursFromNow(24) });
      const booking = await book(slot.id);
      await bookingService.cancelBooking(booking.id);

      const result = await bookingService.listBookingsForFollowUp(5);
      expect(result.needsCall).toHaveLength(0);
      expect(result.upcoming).toHaveLength(0);
    });

    /**
     * The Follow-up tab's own version of the same complaint, and a worse one:
     * this function took only the window, so the page rendered a filter form
     * above a list that could never respond to it. Not just status — the
     * search box and the treatment picker were dead here too.
     */
    describe("filters", () => {
      async function seedTwo() {
        const a = await createSlot({ startsAt: hoursFromNow(24) });
        const b = await createSlot({ startsAt: hoursFromNow(48) });
        await book(a.id, "alice@example.com");
        const confirmed = await book(b.id, "bob@example.com");
        await bookingService.confirmBooking(confirmed.id);
      }

      it("applies a search term to both sections", async () => {
        await seedTwo();

        const result = await bookingService.listBookingsForFollowUp(5, { q: "alice" });

        expect(result.needsCall.map((b) => b.customerEmail)).toEqual(["alice@example.com"]);
        expect(result.upcoming).toHaveLength(0);
        expect(result.needsCallTotal).toBe(1);
      });

      it("applies a status filter", async () => {
        await seedTwo();

        const result = await bookingService.listBookingsForFollowUp(5, { status: "CONFIRMED" });

        expect(result.needsCall).toHaveLength(0);
        expect(result.upcoming.map((b) => b.customerEmail)).toEqual(["bob@example.com"]);
      });

      it("intersects a date range with the window rather than escaping it", async () => {
        const inside = await createSlot({ startsAt: hoursFromNow(24) });
        const outside = await createSlot({ startsAt: hoursFromNow(24 * 30) });
        await book(inside.id, "near@example.com");
        await book(outside.id, "far@example.com");

        // A range reaching well past the follow-up window must not drag in the
        // appointment a month away — the window is a constraint, not a default.
        const result = await bookingService.listBookingsForFollowUp(5, {
          from: new Date(Date.now() - 86_400_000),
          to: new Date(Date.now() + 86_400_000 * 60),
        });

        expect(result.needsCall.map((b) => b.customerEmail)).toEqual(["near@example.com"]);
      });

      it("counts the tab from the whole window, not the filtered rows", async () => {
        await seedTwo();

        // The number on the tab describes the table, exactly like the other
        // three tabs. Otherwise filtering would look like bookings vanishing.
        const result = await bookingService.listBookingsForFollowUp(5, { q: "alice" });

        expect(result.needsCall).toHaveLength(1);
        expect(result.tabTotal).toBe(2);
      });
    });
  });

  describe("listBookingsByEmail", () => {
    it("matches regardless of the case it was typed in", async () => {
      // Booking normalises on write, so "Jane@Example.COM" and
      // "jane@example.com" are the same patient — they used not to be.
      const slot = await createSlot({ startsAt: hoursFromNow(24) });
      await prisma.booking.create({
        data: {
          slotId: slot.id,
          serviceSlug: "test-service",
          customerName: "Jane",
          customerEmail: "jane@example.com",
        },
      });

      expect(await bookingService.listBookingsByEmail("Jane@Example.COM")).toHaveLength(1);
    });

    it("can leave out the booking being looked at", async () => {
      const first = await createSlot({ startsAt: hoursFromNow(24) });
      const second = await createSlot({ startsAt: hoursFromNow(48) });
      const earlier = await book(first.id, "jane@example.com");
      const current = await book(second.id, "jane@example.com");

      const history = await bookingService.listBookingsByEmail("jane@example.com", {
        excludeId: current.id,
      });

      expect(history.map((b) => b.id)).toEqual([earlier.id]);
    });
  });
});
