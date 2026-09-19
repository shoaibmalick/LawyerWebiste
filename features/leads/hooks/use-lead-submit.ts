"use client";

import { useState } from "react";
import type { CreateLeadInput } from "../schema/lead.schema";

type LeadSubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function useLeadSubmit() {
  const [state, setState] = useState<LeadSubmitState>({ status: "idle" });

  async function submit(input: CreateLeadInput) {
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/leads", {
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
