import { Prisma } from "@/generated/prisma/client";
import type { BookingNoteOutcome, BookingStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export class BookingSlotNotFoundError extends Error {
  constructor(slotId: string) {
    super(`Availability slot ${slotId} does not exist.`);
    this.name = "BookingSlotNotFoundError";
  }
}

export class BookingSlotFullError extends Error {
  constructor(slotId: string) {
    super(`Availability slot ${slotId} is fully booked.`);
    this.name = "BookingSlotFullError";
  }
}

/**
 * Raised when a booking could not be completed because concurrent attempts kept
 * colliding, even after retries.
 *
 * Distinct from BookingSlotFullError: the slot may well still have room, we
 * just could not get a clean write. The customer should be told to try again,
 * not that the time is gone.
 */
export class BookingContentionError extends Error {
  constructor(slotId: string) {
    super(`Could not complete a booking for slot ${slotId} — too much contention.`);
    this.name = "BookingContentionError";
  }
}

export class SlotHasBookingsError extends Error {
  constructor(slotId: string) {
    super(`Availability slot ${slotId} still has active bookings.`);
    this.name = "SlotHasBookingsError";
  }
}

/**
 * The booking a dashboard action referred to is no longer in the table — the
 * two-tabs case, where the list on screen is a snapshot someone else has moved
 * on from.
 */
export class BookingNotFoundError extends Error {
  constructor(id: string) {
    super(`Booking ${id} not found`);
    this.name = "BookingNotFoundError";
  }
}

/**
 * A cancelled booking cannot be confirmed — that would reinstate an
 * appointment nobody agreed to give a chair back to.
 */
export class BookingNotConfirmableError extends Error {
  constructor(id: string) {
    super(`Booking ${id} is cancelled and cannot be confirmed.`);
    this.name = "BookingNotConfirmableError";
  }
}

/** Same reasoning: moving a cancelled booking would silently reinstate it. */
export class BookingNotReschedulableError extends Error {
  constructor(id: string) {
    super(`Booking ${id} is cancelled and cannot be moved.`);
    this.name = "BookingNotReschedulableError";
  }
}

/**
 * Prisma's "record required but not found", however the pg driver adapter
 * wraps it — checked structurally for the same reason isWriteConflict below
 * is, since the adapter can surface one failure in more than one shape.
 */
function isRecordNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}

/** Unique constraint. Same structural check, same reason. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/** Foreign key constraint — a child row pointing at a parent that is gone. */
function isForeignKeyViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2003";
}

type AvailableSlot = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  remainingCapacity: number;
};

/**
 * The statuses that occupy a chair.
 *
 * The most consequential constant in this file. Capacity is read in four
 * places, and each used to spell the rule out itself — two as a whitelist of
 * CONFIRMED, two as "anything but CANCELLED". A status added without updating
 * every one of them silently enables unlimited double-booking, which for a
 * single-operatory practice means two patients in the waiting room at 9am.
 *
 * The rule now reads: a booking holds the chair unless it has been cancelled.
 *
 * PENDING_PAYMENT is in this list, reversing an earlier deliberate
 * simplification. The cost is that an abandoned Stripe checkout blocks the slot
 * until its session expires (handled by the checkout.session.expired branch in
 * app/api/webhooks/stripe/route.ts). The benefit is one rule instead of two
 * that differ by a single member — and that "an unpaid booking doesn't hold the
 * chair, but one nobody has rung about does" is not a sentence anyone could
 * defend to the practice.
 *
 * bookingService.test.ts enumerates every BookingStatus member and asserts its
 * classification, so a new status cannot be added without a deliberate choice.
 */
export const CAPACITY_HOLDING_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "PENDING_PAYMENT",
] as const satisfies readonly BookingStatus[];

const HOLDS_CAPACITY = {
  status: { in: [...CAPACITY_HOLDING_STATUSES] },
} satisfies Prisma.BookingWhereInput;

/**
 * How far ahead the public booking calendar looks, and the hard row cap.
 *
 * Both matter because every slot returned here is serialised into the HTML of
 * every page render. A practice that generates a year of availability would
 * otherwise ship thousands of rows to every visitor — measured at ~181KB for a
 * single month, scaling linearly. Nobody books eleven months out, so the
 * horizon costs nothing real and bounds the payload.
 */
const PUBLIC_BOOKING_HORIZON_DAYS = 60;
const PUBLIC_SLOT_LIMIT = 500;

// No longer filtered by service: a slot is a unit of the business's time, and
// every service competes for the same chair. Which services fit a given slot is
// a duration question, answered in features/booking/api/get-available-slots.ts
// where config/content/services.ts is in scope.
async function listAvailableSlots(
  horizonDays: number = PUBLIC_BOOKING_HORIZON_DAYS,
): Promise<AvailableSlot[]> {
  const now = new Date();
  const horizon = new Date(now.getTime() + horizonDays * 86_400_000);

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      startsAt: { gt: now, lte: horizon },
    },
    take: PUBLIC_SLOT_LIMIT,
    include: {
      _count: { select: { bookings: { where: HOLDS_CAPACITY } } },
    },
    orderBy: { startsAt: "asc" },
  });

  return slots
    .map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      remainingCapacity: slot.capacity - slot._count.bookings,
    }))
    .filter((slot) => slot.remainingCapacity > 0);
}

type CreateBookingInput = {
  slotId: string;
  serviceSlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  // Defaults to REQUESTED — a booking made on the website is a request the
  // practice rings about, not an appointment it has agreed to. Pass
  // PENDING_PAYMENT when the "payments" feature requires a deposit, or
  // CONFIRMED for a booking staff are entering on the customer's behalf.
  //
  // Every value here holds the slot's capacity; see
  // CAPACITY_HOLDING_STATUSES. CANCELLED is excluded from the type because
  // creating a booking already cancelled is not a thing anyone means to do.
  status?: Exclude<BookingStatus, "CANCELLED">;
};

/**
 * Is this the database telling us two transactions collided?
 *
 * Checked by shape rather than by one code because Prisma 7 surfaces it two
 * ways under the pg driver adapter: usually PrismaClientKnownRequestError with
 * code P2034, but sometimes a raw DriverAdapterError carrying
 * "TransactionWriteConflict" and no code at all. Matching only P2034 misses
 * roughly a third of them, which is how four concurrent bookings for one slot
 * produced three HTTP 500s.
 */
function isWriteConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2034";
  }
  if (error instanceof Error) {
    return (
      error.name === "DriverAdapterError" &&
      /TransactionWriteConflict|write conflict|deadlock/i.test(
        `${error.message}${"cause" in error ? ` ${String(error.cause)}` : ""}`,
      )
    );
  }
  return false;
}

const WRITE_CONFLICT_RETRIES = 4;

/**
 * Create a booking, retrying if the serializable transaction collides.
 *
 * The isolation level is what makes capacity trustworthy, and its cost is that
 * simultaneous attempts on the same slot abort each other. That abort is
 * transient and meaningless to a customer: on retry the winning booking is
 * committed, so the loser gets a clean BookingSlotFullError (a 409 saying the
 * time was taken) instead of a 500.
 *
 * Backoff is jittered so retries don't march in lockstep and collide again.
 */
/**
 * Run a serializable transaction, retrying if it collides.
 *
 * Extracted so rescheduleBooking uses this exact machinery rather than a copy.
 * A reschedule moves a booking between slots and races the public booking path
 * for the target slot's last seat; a second, drifted version of this loop is
 * precisely how the concurrent-booking HTTP 500s would come back.
 */
async function withWriteConflictRetry<T>(
  attemptOnce: () => Promise<T>,
  onExhausted: () => Error,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await attemptOnce();
    } catch (error) {
      if (!isWriteConflict(error)) {
        throw error;
      }
      if (attempt >= WRITE_CONFLICT_RETRIES) {
        // Retries exhausted. Never let the raw driver error escape — that is
        // what produced HTTP 500s before, and a 500 tells the customer nothing
        // they can act on.
        throw onExhausted();
      }
      const backoffMs = 15 * 2 ** attempt + Math.random() * 20;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}

/**
 * How many future appointments one email may hold at once.
 *
 * Slot ids are public via `GET /api/booking/slots`, so without a cap a single
 * script can hold every chair the practice has published. The receptionist
 * then works through a list of appointments that do not exist while real
 * patients see no availability — a denial of service against the appointment
 * book rather than against the server, and far cheaper to mount than one
 * against the server.
 *
 * Three is chosen to be well clear of legitimate use. A family booking for
 * several people uses several different email addresses in practice, and a
 * patient with more than three outstanding appointments is someone reception
 * would want to know about anyway.
 *
 * **Per email, not per IP.** The email is already stored; an IP is not, and
 * adding one would put a new piece of personal data on every booking row —
 * `docs/PRIVACY_POSTURE.md` states that we do not retain visitor IPs, and this
 * is not a good enough reason to start. The per-source limit stays in
 * `lib/rate-limit.ts`, which is where it belongs.
 */
export const MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL = 3;

export class TooManyActiveBookingsError extends Error {
  constructor(limit: number) {
    // No email in the message: it reaches logs, and L6 keeps patient
    // identifiers out of them.
    super(`This email already holds ${limit} upcoming appointments.`);
    this.name = "TooManyActiveBookingsError";
  }
}

async function createBooking(input: CreateBookingInput) {
  return withWriteConflictRetry(
    () => createBookingOnce(input),
    () => new BookingContentionError(input.slotId),
  );
}

function createBookingOnce(input: CreateBookingInput) {
  return prisma.$transaction(
    async (tx) => {
      const slot = await tx.availabilitySlot.findUnique({
        where: { id: input.slotId },
        include: {
          _count: { select: { bookings: { where: HOLDS_CAPACITY } } },
        },
      });

      if (!slot) {
        throw new BookingSlotNotFoundError(input.slotId);
      }

      if (slot._count.bookings >= slot.capacity) {
        throw new BookingSlotFullError(input.slotId);
      }

      /**
       * How many future chairs this person is already holding.
       *
       * Inside the transaction, and at Serializable, deliberately: two requests
       * arriving together would otherwise both read "2 held" and both write,
       * putting the patient one over the cap. This is the same reasoning that
       * puts the capacity check here rather than in the route.
       *
       * Lower-cased to match how the column is stored — `createBookingSchema`
       * normalises on write and a migration backfilled the rest — so the cap
       * cannot be stepped around by capitalising an address differently.
       */
      const activeFuture = await tx.booking.count({
        where: {
          customerEmail: input.customerEmail.trim().toLowerCase(),
          ...HOLDS_CAPACITY,
          slot: { startsAt: { gt: new Date() } },
        },
      });

      if (activeFuture >= MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL) {
        throw new TooManyActiveBookingsError(MAX_ACTIVE_FUTURE_BOOKINGS_PER_EMAIL);
      }

      return tx.booking.create({
        data: {
          slotId: input.slotId,
          serviceSlug: input.serviceSlug,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          status: input.status ?? "REQUESTED",
        },
        include: { slot: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

function getSlotById(id: string) {
  return prisma.availabilitySlot.findUnique({ where: { id } });
}

function attachCheckoutSession(bookingId: string, stripeCheckoutSessionId: string) {
  return prisma.booking.update({
    where: { id: bookingId },
    data: { stripeCheckoutSessionId },
  });
}

// Idempotent: if the Stripe webhook redelivers the same event (Stripe does
// not guarantee exactly-once delivery), a booking already confirmed simply
// isn't found again and this is a no-op.
async function confirmBookingPayment(stripeCheckoutSessionId: string) {
  const booking = await prisma.booking.findFirst({
    where: { stripeCheckoutSessionId, status: "PENDING_PAYMENT" },
  });

  if (!booking) {
    return null;
  }

  return prisma.booking.update({
    where: { id: booking.id },
    // paid: true here too — an UPFRONT deposit collected via Stripe counts
    // as paid the same as a manually-marked in-person payment does.
    data: { status: "CONFIRMED", paid: true },
    include: { slot: true },
  });
}

/**
 * The dashboard bookings list.
 *
 * Capped and counted rather than unbounded: a practice doing twenty
 * appointments a day has seven thousand rows after a year, and rendering all of
 * them makes the page slower every week it operates. The count tells staff what
 * they are not seeing.
 */
const BOOKINGS_PAGE_SIZE = 100;

/**
 * The booking behind a Checkout Session, whatever its status.
 *
 * confirmBookingPayment deliberately returns null once a booking is already
 * confirmed — that is what makes it idempotent against Stripe's redelivery.
 * But a retry still needs to reach the booking to finish the *email*, so this
 * exists alongside it rather than weakening that contract.
 */
function findBookingByCheckoutSession(stripeCheckoutSessionId: string) {
  return prisma.booking.findFirst({
    where: { stripeCheckoutSessionId },
    include: { slot: true },
  });
}

/** Marks the confirmation email as delivered, so no retry sends it twice. */
function markConfirmationEmailSent(id: string) {
  return prisma.booking.update({
    where: { id },
    data: { confirmationEmailSentAt: new Date() },
  });
}

export type BookingFilters = {
  status?: BookingStatus;
  serviceSlug?: string;
  /** One box, matched against name, email and phone. */
  q?: string;
  /** Appointment date range. Both are instants; `to` is the NEXT midnight. */
  from?: Date;
  to?: Date;
};

/** Which slice of the list the dashboard is showing. */
export type BookingView = "requests" | "followup" | "upcoming" | "all";

export type BookingStatusCounts = Record<BookingStatus, number> & { all: number };

/**
 * Exported so it can be unit-tested without a database — pure, and the
 * combining rules are the part worth pinning.
 */
export function buildBookingWhere(filters: BookingFilters): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.serviceSlug) where.serviceSlug = filters.serviceSlug;

  // One box OR-ed across three columns, deliberately unlike leadService, which
  // ANDs three separate boxes. A receptionist with a patient on the phone has
  // one identifier in hand and does not know which field it is in — "it might
  // be under her husband's number".
  //
  // ILIKE '%term%' with a leading wildcard, so no btree serves it; see the lead
  // index migration for why that is the right trade at this table's size.
  if (filters.q) {
    where.OR = [
      { customerName: { contains: filters.q, mode: "insensitive" } },
      { customerEmail: { contains: filters.q, mode: "insensitive" } },
      { customerPhone: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  // startsAt lives on AvailabilitySlot, not Booking, so an appointment-date
  // filter nests through the relation.
  if (filters.from || filters.to) {
    where.slot = {
      startsAt: {
        ...(filters.from ? { gte: filters.from } : {}),
        // `lt` and not `lte`, because `to` is already the next midnight. With
        // `lte: startOfDay(to)` a range ending on the appointment's own day
        // would find nothing — every appointment that day starts after
        // midnight.
        ...(filters.to ? { lt: filters.to } : {}),
      },
    };
  }

  return where;
}

/**
 * Which statuses each tab is about.
 *
 * Exported because the filter form needs the same list: offering "Cancelled"
 * inside the Requests tab is offering a choice that can only ever return
 * nothing, and two copies of this mapping would drift.
 */
/**
 * `as const satisfies` rather than a type annotation, so each entry keeps its
 * literal type. Annotating the object as `Record<…, readonly [] | null>` would
 * widen every member to "array or null" and force a non-null assertion at each
 * use below — an assertion that is only safe because of what is written three
 * lines above it, which is exactly the kind CLAUDE.md rules out.
 */
export const VIEW_STATUSES = {
  requests: ["REQUESTED"],
  // Both follow-up sections together — the tab splits them for the eye, but a
  // status filter applies across the whole page.
  followup: ["REQUESTED", "CONFIRMED", "PENDING_PAYMENT"],
  upcoming: ["REQUESTED", "CONFIRMED", "PENDING_PAYMENT"],
  /** null means "no constraint", which is not the same as an empty list. */
  all: null,
} as const satisfies Record<BookingView, readonly BookingStatus[] | null>;

const VIEW_WHERE: Record<BookingView, Prisma.BookingWhereInput> = {
  requests: { status: "REQUESTED" },
  followup: {},
  upcoming: { status: { in: [...VIEW_STATUSES.upcoming] } },
  all: {},
};

/**
 * The view's constraint AND the caller's filters — never a spread.
 *
 * This was `{ ...buildBookingWhere(filters), ...VIEW_WHERE[view] }`, and the
 * spread order meant the view's `status` silently overwrote the one the
 * receptionist had just picked. Choosing a status did nothing at all on
 * Requests and Upcoming, and appeared to work only on All, whose view clause
 * is `{}` and so contributes no `status` key to overwrite it.
 *
 * `AND` makes the two compose the way the UI implies: the tab picks the set,
 * the filter narrows within it. Picking a status the tab excludes now returns
 * no rows, which is the honest answer rather than quietly ignoring the choice.
 */
function whereForView(filters: BookingFilters, view: BookingView): Prisma.BookingWhereInput {
  return { AND: [buildBookingWhere(filters), VIEW_WHERE[view]] };
}

async function listAllBookings(
  filters: BookingFilters = {},
  view: BookingView = "all",
  limit: number = BOOKINGS_PAGE_SIZE,
) {
  const where = whereForView(filters, view);

  // Ordering is a property of the view, not of the table. A work queue is
  // ordered by when the appointment happens — the unconfirmed one tomorrow is
  // the one that will go wrong, regardless of when it was requested. "All" is
  // an archive, where "the booking that just came in" must stay findable.
  const byAppointment = view !== "all";
  const orderBy: Prisma.BookingOrderByWithRelationInput[] = byAppointment
    ? [{ slot: { startsAt: "asc" } }, { id: "asc" }]
    : // id breaks the tie so the order is at least *stable*: createdAt is
      // timestamp(3), and two rows written in the same millisecond would
      // otherwise come back in whatever order Postgres feels like, reshuffling
      // between page loads.
      [{ createdAt: "desc" }, { id: "desc" }];

  const [bookings, matching, total, grouped] = await Promise.all([
    prisma.booking.findMany({ where, include: { slot: true }, take: limit, orderBy }),
    prisma.booking.count({ where }),
    prisma.booking.count(),
    // No `where`: the tab labels describe the whole table, not the current
    // view. Otherwise every tab would read (n) of itself and switching views
    // would look like data disappearing.
    prisma.booking.groupBy({ by: ["status"], _count: true }),
  ]);

  const statusCounts: BookingStatusCounts = {
    REQUESTED: 0,
    CONFIRMED: 0,
    PENDING_PAYMENT: 0,
    CANCELLED: 0,
    all: 0,
  };
  for (const row of grouped) {
    statusCounts[row.status] = row._count;
    statusCounts.all += row._count;
  }

  return { bookings, matching, total, statusCounts };
}

const FOLLOW_UP_PAGE_SIZE = 100;

/**
 * Appointments coming up inside the follow-up window.
 *
 * Two separately capped queries rather than one list the page splits, so a busy
 * week of confirmed appointments can never push the unconfirmed requests off
 * the bottom of a single page. The requests are the ones that will go wrong.
 */
/**
 * Takes filters like every other list.
 *
 * It used to take only the window, while the page rendered the filter form
 * above it regardless — so on the Follow-up tab typing a patient's name, or
 * picking a treatment or a status, appeared to do nothing whatsoever. The form
 * was not broken; its output was never reaching the query.
 *
 * `from`/`to` compose with the follow-up window rather than replacing it. Both
 * are constraints on the same column, so an AND of the two is the intersection
 * — narrowing to a couple of days inside the window works, and asking for a
 * range outside it correctly returns nothing rather than escaping the window.
 */
async function listBookingsForFollowUp(
  windowDays: number,
  filters: BookingFilters = {},
  now: Date = new Date(),
) {
  const horizon = new Date(now.getTime() + windowDays * 86_400_000);
  const inWindow = { slot: { startsAt: { gte: now, lt: horizon } } };
  const confirmedish = { status: { in: ["CONFIRMED", "PENDING_PAYMENT"] as BookingStatus[] } };
  const byAppointment: Prisma.BookingOrderByWithRelationInput[] = [
    { slot: { startsAt: "asc" } },
    { id: "asc" },
  ];

  const chosen = buildBookingWhere(filters);
  const needsCallWhere: Prisma.BookingWhereInput = {
    AND: [chosen, inWindow, { status: "REQUESTED" }],
  };
  const upcomingWhere: Prisma.BookingWhereInput = { AND: [chosen, inWindow, confirmedish] };

  const [needsCall, upcoming, needsCallTotal, upcomingTotal, tabTotal] = await Promise.all([
    prisma.booking.findMany({
      where: needsCallWhere,
      include: { slot: true },
      take: FOLLOW_UP_PAGE_SIZE,
      orderBy: byAppointment,
    }),
    prisma.booking.findMany({
      where: upcomingWhere,
      include: { slot: true },
      take: FOLLOW_UP_PAGE_SIZE,
      orderBy: byAppointment,
    }),
    prisma.booking.count({ where: needsCallWhere }),
    prisma.booking.count({ where: upcomingWhere }),
    // Deliberately unfiltered: this is the number on the tab, and a tab label
    // describes the whole table. The other tabs take theirs from statusCounts,
    // which has no `where` for the same reason — otherwise filtering would
    // look like bookings disappearing from every tab at once.
    prisma.booking.count({
      where: {
        AND: [inWindow, { status: { in: [...VIEW_STATUSES.followup] } }],
      },
    }),
  ]);

  return { needsCall, upcoming, needsCallTotal, upcomingTotal, tabTotal };
}

// For the optional "customerAccounts" feature, and for the receptionist's call
// panel — a patient's own history, matched by email (no relation to Customer is
// modeled; a guest booking still shows up once they sign up with the same
// email).
/**
 * Cap for a patient's own booking history when the caller doesn't name one.
 *
 * `take: undefined` is not "no limit specified", it is "no limit" — Prisma
 * omits LIMIT entirely and the query returns the whole history. A long-standing
 * patient with years of appointments is a slow page rather than a breach, but
 * an unbounded query reachable from a request is worth closing on principle.
 */
const DEFAULT_BOOKING_HISTORY_LIMIT = 100;

function listBookingsByEmail(email: string, options: { excludeId?: string; limit?: number } = {}) {
  return prisma.booking.findMany({
    where: {
      // Lower-cased because that is how it is stored (normalised at the Zod
      // boundary, backfilled by migration) — an equality match the
      // customerEmail index can serve, rather than an ILIKE it cannot.
      customerEmail: email.trim().toLowerCase(),
      ...(options.excludeId ? { id: { not: options.excludeId } } : {}),
    },
    include: { slot: true },
    take: options.limit ?? DEFAULT_BOOKING_HISTORY_LIMIT,
    // id breaks the tie so the order is at least *stable*: createdAt is
    // timestamp(3), and two rows written in the same millisecond would
    // otherwise come back in whatever order Postgres feels like, reshuffling
    // between page loads. cuid() is not guaranteed sortable, so this fixes
    // determinism, not chronology — within one millisecond either order is
    // defensible, but flipping between refreshes is not.
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

/**
 * Delete a slot the reschedule override conjured, once nothing holds it.
 *
 * An override opening exists only for the booking it was made for. Left behind,
 * "squeeze her in Sunday at 7pm" becomes a publicly bookable Sunday evening the
 * moment that booking moves or is cancelled — and a stranger books it.
 *
 * Slots the practice generated itself are never touched: emptying one is how
 * availability is supposed to work, and /dashboard/availability owns deleting
 * them.
 */
async function dropVacatedOverrideSlot(tx: Prisma.TransactionClient, slotId: string) {
  const slot = await tx.availabilitySlot.findUnique({
    where: { id: slotId },
    include: { _count: { select: { bookings: { where: HOLDS_CAPACITY } } } },
  });

  if (!slot || !slot.createdByOverride || slot._count.bookings > 0) return;

  await tx.booking.deleteMany({ where: { slotId: slot.id } });
  await tx.availabilitySlot.delete({ where: { id: slot.id } });
}

async function cancelBooking(id: string) {
  return prisma.$transaction(async (tx) => {
    let cancelled;
    try {
      cancelled = await tx.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { slot: true },
      });
    } catch (error) {
      if (isRecordNotFound(error)) throw new BookingNotFoundError(id);
      throw error;
    }

    await dropVacatedOverrideSlot(tx, cancelled.slotId);
    return cancelled;
  });
}

/**
 * Mark a booking as agreed with the patient.
 *
 * Not a capacity event: REQUESTED and CONFIRMED both hold the chair, so
 * confirming can neither free nor take one. That is what makes it safe to do
 * outside a serializable transaction.
 */
async function confirmBooking(id: string) {
  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new BookingNotFoundError(id);
  // Reinstating a cancelled appointment by "confirming" it would take a chair
  // nobody agreed to give back.
  if (booking.status === "CANCELLED") throw new BookingNotConfirmableError(id);

  return prisma.booking.update({
    where: { id },
    data: { status: "CONFIRMED" },
    include: { slot: true },
  });
}

export type RescheduleTarget =
  { kind: "slot"; slotId: string } | { kind: "override"; startsAt: Date; endsAt: Date };

type RescheduleInput = {
  bookingId: string;
  target: RescheduleTarget;
  /** Explicit — the UI has two buttons and each says which it is. */
  confirm: boolean;
};

/**
 * Move a booking to another time.
 *
 * One serializable transaction and a single `update` of `slotId` — never
 * delete-then-create, so there is no window in which the booking does not
 * exist. Uses the same retry machinery as createBooking because it races the
 * public booking path for the target slot's last seat.
 */
async function rescheduleBooking(input: RescheduleInput) {
  return withWriteConflictRetry(
    () => rescheduleBookingOnce(input),
    () => new BookingContentionError(input.bookingId),
  );
}

function rescheduleBookingOnce(input: RescheduleInput) {
  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        include: { slot: true },
      });
      if (!booking) throw new BookingNotFoundError(input.bookingId);
      // A cancelled booking given a new time would silently reinstate itself
      // and take a chair nobody agreed to give it.
      if (booking.status === "CANCELLED") throw new BookingNotReschedulableError(booking.id);

      const previousSlotId = booking.slotId;
      const target = await resolveTargetSlot(tx, input.target);

      // Moving a booking to the slot it already occupies is not a conflict —
      // but the capacity check below would count the booking against itself
      // and report the slot full, which at capacity 1 is EVERY same-slot move.
      if (target.id !== booking.slotId) {
        const held = await tx.booking.count({
          // `id: not` is belt and braces given the branch above, and is what
          // keeps this correct if that branch is ever removed.
          where: { slotId: target.id, ...HOLDS_CAPACITY, id: { not: booking.id } },
        });
        if (held >= target.capacity) throw new BookingSlotFullError(target.id);
      }

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: {
          slotId: target.id,
          ...(input.confirm ? { status: "CONFIRMED" as const } : {}),
        },
        include: { slot: true },
      });

      if (previousSlotId !== target.id) {
        await dropVacatedOverrideSlot(tx, previousSlotId);
      }

      return { booking: updated, previousSlotId, moved: previousSlotId !== target.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

async function resolveTargetSlot(tx: Prisma.TransactionClient, target: RescheduleTarget) {
  if (target.kind === "slot") {
    const slot = await tx.availabilitySlot.findUnique({ where: { id: target.slotId } });
    if (!slot) throw new BookingSlotNotFoundError(target.slotId);
    return slot;
  }

  // The override reuses an existing slot at that instant rather than creating a
  // second one. AvailabilitySlot.startsAt is @unique, which is both what makes
  // that possible and what makes it necessary: without the upsert this throws a
  // constraint violation, and without the unique constraint it would quietly
  // manufacture a parallel chair at 2pm and double-book the practice.
  try {
    return await tx.availabilitySlot.upsert({
      where: { startsAt: target.startsAt },
      // Never widen an existing slot — an override must not raise the capacity
      // of a time the practice already publishes.
      update: {},
      create: {
        startsAt: target.startsAt,
        endsAt: target.endsAt,
        capacity: 1,
        createdByOverride: true,
      },
    });
  } catch (error) {
    // Same idiom as siteSettingsService: Prisma's upsert can degrade to
    // find-then-create, so a concurrent override for the same instant loses the
    // insert. Losing that race is not an error — the winner created exactly the
    // slot we wanted.
    if (!isUniqueViolation(error)) throw error;
    return tx.availabilitySlot.findUniqueOrThrow({ where: { startsAt: target.startsAt } });
  }
}

function getBookingById(id: string) {
  return prisma.booking.findUnique({ where: { id }, include: { slot: true } });
}

const NOTES_PAGE_SIZE = 50;

type AddBookingNoteInput = {
  bookingId: string;
  outcome: BookingNoteOutcome;
  body?: string;
  authorEmail?: string | null;
  authorName?: string | null;
};

async function addBookingNote(input: AddBookingNoteInput) {
  try {
    return await prisma.bookingNote.create({
      data: {
        bookingId: input.bookingId,
        outcome: input.outcome,
        body: input.body,
        authorEmail: input.authorEmail ?? undefined,
        authorName: input.authorName ?? undefined,
      },
    });
  } catch (error) {
    // A note against a booking someone else just deleted.
    if (isForeignKeyViolation(error)) throw new BookingNotFoundError(input.bookingId);
    throw error;
  }
}

function listBookingNotes(bookingId: string, limit: number = NOTES_PAGE_SIZE) {
  return prisma.bookingNote.findMany({
    where: { bookingId },
    take: limit,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

// For PaymentSettings.timing === AFTER_SERVICE: staff mark payment collected
// in person from the dashboard, since there's no Stripe Checkout at booking
// time to confirm it automatically.
async function markPaid(id: string) {
  try {
    return await prisma.booking.update({ where: { id }, data: { paid: true } });
  } catch (error) {
    if (isRecordNotFound(error)) throw new BookingNotFoundError(id);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Availability management (admin)
// ---------------------------------------------------------------------------

type AdminSlot = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  activeBookings: number;
};

/**
 * Slots from `since` onward, with a live booking count so the dashboard can
 * show what is spoken for and refuse to delete it. Past slots are excluded:
 * they are immutable history and would bury the part staff can still act on.
 */
const ADMIN_SLOT_PAGE_SIZE = 300;

async function listUpcomingSlots(
  since: Date = new Date(),
  limit: number = ADMIN_SLOT_PAGE_SIZE,
): Promise<{ slots: AdminSlot[]; total: number }> {
  const [slots, total] = await Promise.all([
    prisma.availabilitySlot.findMany({
      where: { startsAt: { gte: since } },
      take: limit,
      include: {
        _count: { select: { bookings: { where: HOLDS_CAPACITY } } },
      },
      orderBy: { startsAt: "asc" },
    }),
    prisma.availabilitySlot.count({ where: { startsAt: { gte: since } } }),
  ]);

  return {
    slots: slots.map((slot) => ({
      id: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      capacity: slot.capacity,
      activeBookings: slot._count.bookings,
    })),
    total,
  };
}

type NewSlot = { startsAt: Date; endsAt: Date };

/**
 * Insert slots, skipping any that already exist.
 *
 * `startsAt` is now unique, so a duplicate is a constraint violation rather
 * than a silent doubling of capacity. `skipDuplicates` lets the database be the
 * arbiter instead of a read-then-filter that could race with another admin
 * generating an overlapping range at the same moment.
 */
async function createSlots(
  slots: NewSlot[],
  capacity: number,
): Promise<{ created: number; skipped: number }> {
  if (slots.length === 0) return { created: 0, skipped: 0 };

  const { count } = await prisma.availabilitySlot.createMany({
    data: slots.map((slot) => ({ ...slot, capacity })),
    skipDuplicates: true,
  });

  return { created: count, skipped: slots.length - count };
}

/**
 * Remove a slot, refusing if anyone still holds it.
 *
 * Booking.slotId is a required relation with no cascade, so deleting a booked
 * slot would either fail at the database or orphan a customer's appointment.
 * Cancelled bookings don't count — those are already released.
 */
async function deleteSlot(id: string): Promise<{ removedCancelledBookings: number }> {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.availabilitySlot.findUnique({
      where: { id },
      include: {
        _count: { select: { bookings: { where: HOLDS_CAPACITY } } },
      },
    });

    if (!slot) throw new BookingSlotNotFoundError(id);
    if (slot._count.bookings > 0) throw new SlotHasBookingsError(id);

    // A cancelled booking still holds the foreign key, so the delete below
    // fails at the database while any exist — the status is irrelevant to the
    // constraint. They are removed with the slot rather than blocking it:
    // once the time is gone, "booked this slot, then cancelled" points at a
    // slot that no longer exists, and listAllBookings renders bookings by
    // joining their slot, so it could not display them anyway. The count is
    // returned so the caller can say plainly what was removed.
    const { count } = await tx.booking.deleteMany({
      where: { slotId: id, status: "CANCELLED" },
    });

    await tx.availabilitySlot.delete({ where: { id } });

    return { removedCancelledBookings: count };
  });
}

export const bookingService = {
  listAvailableSlots,
  listUpcomingSlots,
  createSlots,
  deleteSlot,
  getSlotById,
  createBooking,
  attachCheckoutSession,
  confirmBookingPayment,
  findBookingByCheckoutSession,
  markConfirmationEmailSent,
  listAllBookings,
  listBookingsForFollowUp,
  listBookingsByEmail,
  getBookingById,
  cancelBooking,
  confirmBooking,
  rescheduleBooking,
  addBookingNote,
  listBookingNotes,
  markPaid,
};
