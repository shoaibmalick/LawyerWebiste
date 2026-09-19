import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { siteConfig } from "@/config/site.config";
import { getBusiness } from "@/features/site-settings";
import { sendEmail } from "@/lib/email";
import { formatDateTimeLong } from "@/lib/format";
import { escapeHtml } from "@/lib/html";
import { getStripe } from "@/lib/stripe";
import { resolveStripeWebhookSecret } from "@/lib/stripe-config";
import { bookingService } from "@/server/services/bookingService";

export async function POST(request: Request) {
  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  // From the stored settings, falling back to the environment. Read here
  // rather than passed in: this route runs before any session and must verify
  // the signature before it trusts a single byte of the body, so it cannot
  // look anything up using the payload.
  const webhookSecret = await resolveStripeWebhookSecret();
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret is not configured." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    // Logged in full, returned generic. Stripe's own message distinguishes
    // "no signatures found matching the expected signature" from "timestamp
    // outside the tolerance zone" — useful to us, and a free oracle for anyone
    // probing this endpoint with forged signatures. Only Stripe should be
    // calling it, and Stripe does not read the body of a 400.
    console.error("[stripe] webhook signature verification failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    // Safe: Stripe's types don't narrow `event.data.object` from `event.type`,
    // but this branch only runs for "checkout.session.completed" events.
    const session = event.data.object as Stripe.Checkout.Session;

    // Idempotent: returns null when the booking is already CONFIRMED, which is
    // what makes a redelivered event safe.
    const confirmed = await bookingService.confirmBookingPayment(session.id);

    // ...but a redelivery is also how a failed email gets a second chance, so
    // fall back to a plain lookup. Previously this branch simply did nothing on
    // a retry, which meant an email that failed once was never sent at all and
    // the customer was never told about the appointment they had paid for.
    const booking = confirmed ?? (await bookingService.findBookingByCheckoutSession(session.id));

    if (booking && !booking.confirmationEmailSentAt) {
      // Deliberately not caught. Letting this throw returns a non-2xx, which is
      // precisely how Stripe is told to try again — and a failed webhook is
      // visible in their dashboard, where swallowing it would be silent.
      const outcome = await sendEmail({
        to: booking.customerEmail,
        subject: `Your booking with ${siteConfig.business.name} is confirmed`,
        // customerName came from a public form. See lib/html.ts.
        html: `
          <p>Hi ${escapeHtml(booking.customerName)},</p>
          <p>Your deposit was received and your appointment is confirmed for ${formatDateTimeLong(booking.slot.startsAt)}.</p>
          <p>${escapeHtml(siteConfig.business.name)}<br />${escapeHtml((await getBusiness()).phone)}</p>
        `,
      });

      // Only after a successful send, so a crash between the two re-sends
      // rather than silently dropping it. A duplicate confirmation is a far
      // smaller problem than none.
      //
      // `delivered` matters as much as the absence of a throw. sendEmail
      // resolves without sending anything when no transport is configured, so
      // marking unconditionally set the very flag that stops a retry — a
      // business that fixed its email settings an hour later would never have
      // sent this confirmation at all.
      if (outcome.delivered) {
        await bookingService.markConfirmationEmailSent(booking.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
