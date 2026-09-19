import { NextResponse } from "next/server";
import {
  createBookingSchema,
  ServiceTooLongForSlotError,
  submitBooking,
  UnknownServiceError,
} from "@/features/booking";
import { guardPublicPost, validationError } from "@/lib/api-guards";
import { isFeatureEnabled } from "@/lib/features";
import { isLikelyBot, stripHoneypot } from "@/lib/honeypot";
import { StripeNotConfiguredError } from "@/lib/stripe";
import {
  BookingContentionError,
  BookingSlotFullError,
  BookingSlotNotFoundError,
  TooManyActiveBookingsError,
} from "@/server/services/bookingService";

export async function POST(request: Request) {
  if (!isFeatureEnabled("booking")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guard = await guardPublicPost(request, { limitKey: "booking", max: 5 });
  if (!guard.ok) return guard.response;

  const parsed = createBookingSchema.safeParse(guard.body);
  if (!parsed.success) {
    return validationError("Invalid booking details.", parsed.error);
  }

  // Filled honeypot: answer exactly as if it had worked, and write nothing.
  // Worth more here than on the other two forms — a spam booking does not just
  // add a row, it takes a chair out of the appointment book and sends the
  // receptionist off to ring a number that does not exist.
  if (isLikelyBot(parsed.data)) {
    return NextResponse.json({ booking: null }, { status: 201 });
  }

  try {
    const result = await submitBooking(stripHoneypot(parsed.data));
    if ("checkoutUrl" in result) {
      return NextResponse.json({ checkoutUrl: result.checkoutUrl }, { status: 200 });
    }
    return NextResponse.json({ booking: result.booking }, { status: 201 });
  } catch (error) {
    if (error instanceof BookingSlotFullError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // 503 with Retry-After rather than 500: the request was fine and will
    // probably succeed on a second attempt.
    if (error instanceof BookingContentionError) {
      return NextResponse.json(
        { error: "We couldn't confirm that just now — please try again." },
        { status: 503, headers: { "Retry-After": "2" } },
      );
    }
    if (error instanceof BookingSlotNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    // 409 rather than 429: nothing is rate-limited here and waiting will not
    // help. It is a conflict with appointments this person already holds, and
    // the message says what to do about it rather than just refusing.
    if (error instanceof TooManyActiveBookingsError) {
      return NextResponse.json(
        {
          error:
            "You already have several upcoming appointments with us. " +
            "Please call us and we'll arrange the next one with you.",
        },
        { status: 409 },
      );
    }
    if (error instanceof UnknownServiceError) {
      return NextResponse.json({ error: "That service isn't offered." }, { status: 400 });
    }
    // 409 rather than 400: the request was well formed, it conflicts with how
    // long that appointment actually takes.
    if (error instanceof ServiceTooLongForSlotError) {
      return NextResponse.json(
        { error: "That appointment needs longer than this slot — please pick another time." },
        { status: 409 },
      );
    }
    if (error instanceof StripeNotConfiguredError) {
      return NextResponse.json(
        { error: "Online payment is not available right now — please call us to book." },
        { status: 503 },
      );
    }
    throw error;
  }
}
