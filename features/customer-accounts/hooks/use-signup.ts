"use client";

import { useState } from "react";
import type { SignupInput } from "../schema/customer.schema";

type SignupState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

export function useSignup() {
  const [state, setState] = useState<SignupState>({ status: "idle" });

  async function submit(input: SignupInput) {
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/customer-accounts/signup", {
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
