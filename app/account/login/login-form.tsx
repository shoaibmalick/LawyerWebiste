"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { customerLoginAction } from "./actions";

export function CustomerLoginForm() {
  const [error, formAction, isPending] = useActionState(customerLoginAction, undefined);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-foreground text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
