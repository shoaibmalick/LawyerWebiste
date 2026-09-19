import { services } from "@/config/content/services";
import { siteConfig } from "@/config/site.config";
import { getBusiness } from "@/features/site-settings";
import { stripeCurrency } from "@/lib/money";
import { sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/env";
import { isFeatureEnabled } from "@/lib/features";
import { requireStripe } from "@/lib/stripe";
import { bookingService, BookingSlotNotFoundError } from "@/server/services/bookingService";
import { settingsService } from "@/server/services/settingsService";
import type { CreateBookingInput } from "../schema/booking.schema";
import { bookingRequestNotificationEmail, bookingRequestReceivedEmail } from "./booking-emails";

export class UnknownServiceError extends Error {
  constructor(serviceSlug: string) {
    super(`No service configured with slug ${serviceSlug}.`);
    this.name = "UnknownServiceError";
  }
}

export class ServiceTooLongForSlotError extends Error {
  constructor(serviceSlug: string, slotId: string) {
    super(`Service ${serviceSlug} does not fit inside slot ${slotId}.`);
    this.name = "ServiceTooLongForSlotError";
  }
}

type SubmitBookingResult =
  { checkoutUrl: string } | { booking: Awaited<ReturnType<typeof bookingService.createBooking>> };

export async function submitBooking(input: CreateBookingInput): Promise<SubmitBookingResult> {
  const slot = await bookingService.getSlotById(input.slotId);
  if (!slot) {
    throw new BookingSlotNotFoundError(input.slotId);
  }

  // The service is the customer's choice now, so it is untrusted input and is
  // checked here rather than read off the slot.
  const service = services.find((candidate) => candidate.slug === input.serviceSlug);
  if (!service) {
    throw new UnknownServiceError(input.serviceSlug);
  }

  // With one chair, a 60-minute treatment booked into a 30-minute slot puts the
  // business into the next appointment. The UI only offers services that fit,
  // but that is a convenience — this is the boundary that enforces it.
  const slotMinutes = Math.round((slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000);
  if (service.durationMinutes > slotMinutes) {
    throw new ServiceTooLongForSlotError(input.serviceSlug, input.slotId);
  }
  const paymentSettings = await settingsService.getPaymentSettings();

  // Payments must be on, the service must have a deposit configured, AND the
  // business must currently collect payment upfront (not after the visit,
  // per PaymentSettings — see /dashboard/settings) for Stripe Checkout to be
  // required at booking time.
  const requiresUpfrontDeposit =
    isFeatureEnabled("payments") &&
    Boolean(service.depositAmount) &&
    paymentSettings.timing === "UPFRONT";

  if (requiresUpfrontDeposit) {
    // Resolved before the booking row is written, so an unconfigured till
    // fails the request outright rather than leaving a PENDING_PAYMENT
    // booking holding a slot that no checkout will ever arrive for.
    const stripe = await requireStripe();

    const booking = await bookingService.createBooking({ ...input, status: "PENDING_PAYMENT" });
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            // Server-side config, never the request — see lib/money.ts and the
            // note on siteConfig.business.currency. The old literal "usd"
            // charged US dollars from every deployment, Ontario included.
            currency: stripeCurrency(),
            product_data: { name: `${service.name} deposit — ${siteConfig.business.name}` },
            unit_amount: service.depositAmount!,
          },
          quantity: 1,
        },
      ],
      customer_email: input.customerEmail,
      success_url: `${siteUrl}/booking/success`,
      cancel_url: `${siteUrl}/booking/cancelled`,
      metadata: { bookingId: booking.id },
    });

    if (!checkoutSession.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    await bookingService.attachCheckoutSession(booking.id, checkoutSession.id);

    return { checkoutUrl: checkoutSession.url };
  }

  // No status passed, so this is a REQUESTED booking — the business rings the
  // customer and confirms it. See CreateBookingInput in bookingService.
  const booking = await bookingService.createBooking(input);

  // The booking is the commitment; the emails are a courtesy on top of it.
  //
  // Letting a send failure propagate meant the customer saw "something went
  // wrong" for a booking that had in fact been made — so they book again, or
  // ring to ask, and the business ends up with a duplicate and a confused
  // customer. Resend being down, or RESEND_FROM_EMAIL unset while the API key is
  // present, is enough to trigger it.
  //
  // Unlike the Stripe webhook there is no retry mechanism here, so this is
  // best-effort by necessity: log loudly when it fails, never fail the booking.
  //
  // Two separate try/catch blocks rather than one, and deliberately not
  // Promise.all: a failure to notify the business must not suppress the
  // customer's email, and vice versa. They fail for different reasons and the
  // log lines need to say which.
  //
  // Note there is NO markConfirmationEmailSent here any more. That column means
  // "the confirmation has gone out" and is the Stripe webhook's retry guard;
  // setting it for a *request* email would make it lie and could suppress the
  // real confirmation later.
  // Read once for both emails below: the recipient address and the phone
  // number in the body are both editable from the dashboard now.
  const business = await getBusiness();

  try {
    await sendEmail({
      to: input.customerEmail,
      ...bookingRequestReceivedEmail({
        customerName: input.customerName,
        serviceName: service.name,
        startsAt: booking.slot.startsAt,
        businessPhone: business.phone,
      }),
    });
  } catch (error) {
    // The booking id, not the address. Server logs are a lower-trust store
    // than the database and are read by more people; the id is enough to find
    // the row, and the row has the address.
    console.error(
      `[booking] request email failed for booking ${booking.id} — the request is recorded and the customer has not been told we will call`,
      error,
    );
  }

  // Nobody was told about a new booking before this. Under a call-them-back
  // model that is the difference between a request being actioned and one
  // sitting unseen until the customer turns up.
  try {
    await sendEmail({
      to: business.email,
      ...bookingRequestNotificationEmail({
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        serviceName: service.name,
        startsAt: booking.slot.startsAt,
        dashboardUrl: `${siteUrl}/dashboard/bookings`,
      }),
    });
  } catch (error) {
    console.error(
      `[booking] business notification failed for booking ${booking.id} — nobody has been told to ring the customer`,
      error,
    );
  }

  return { booking };
}
