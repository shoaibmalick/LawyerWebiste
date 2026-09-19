"use client";

import { useState } from "react";
import type { QuoteRequestInput } from "../schema/quote.schema";

type QuoteSubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function useQuoteSubmit() {
  const [state, setState] = useState<QuoteSubmitState>({ status: "idle" });

  async function submit(input: QuoteRequestInput) {
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message =
          typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.";
        setState({ status: "error", message });
        return;
      }

      setState({ status: "success" });
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  return { state, submit };
}
