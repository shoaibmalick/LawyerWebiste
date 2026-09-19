"use client";

import { useState } from "react";
import type { CreateLeadInput } from "@/features/leads";
import type { CreateBookingInput } from "../schema/booking.schema";

type BookingSubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  /** The booking was recorded as a request; the practice will call to confirm. */
  | { status: "requested" }
  // An enquiry is not a confirmed appointment, so it gets its own terminal
  // state — the form must not tell someone their slot is booked when what
  // actually happened is that a lead was filed for someone to ring them back.
  | { status: "enquiry-sent" }
  | { status: "redirecting" }
  | { status: "error"; message: string };

export function useBookingSubmit() {
  const [state, setState] = useState<BookingSubmitState>({ status: "idle" });

  async function post(url: string, input: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => null);
    return { response, body };
  }

  async function submit(input: CreateBookingInput) {
    setState({ status: "submitting" });

    try {
      const { response, body } = await post("/api/booking", input);

      if (!response.ok) {
        const message =
          typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.";
        setState({ status: "error", message });
        return;
      }

      if (typeof body?.checkoutUrl === "string") {
        setState({ status: "redirecting" });
        window.location.href = body.checkoutUrl;
        return;
      }

      // A request is not a confirmed appointment, so it gets its own terminal
      // state — the same reasoning as enquiry-sent above. Reading the status
      // back from the response rather than assuming keeps the form honest if
      // the deposit path ever confirms immediately.
      setState({ status: body?.booking?.status === "REQUESTED" ? "requested" : "success" });
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  /**
   * The "my treatment isn't listed" path. There is no availability slot to
   * book against, so this files a Lead for the practice to follow up rather
   * than inventing a Booking with nothing behind it.
   */
  async function submitEnquiry(input: CreateLeadInput) {
    setState({ status: "submitting" });

    try {
      const { response, body } = await post("/api/leads", input);

      if (!response.ok) {
        const message =
          typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.";
        setState({ status: "error", message });
        return;
      }

      setState({ status: "enquiry-sent" });
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  return { state, submit, submitEnquiry };
}
