"use client";

import { useState } from "react";
import type { CreateReviewInput } from "../schema/review.schema";

type ReviewSubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function useReviewSubmit() {
  const [state, setState] = useState<ReviewSubmitState>({ status: "idle" });

  async function submit(input: CreateReviewInput) {
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/reviews", {
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
