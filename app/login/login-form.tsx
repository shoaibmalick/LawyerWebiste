"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { Captcha } from "@/lib/captcha";
import { loginAction } from "./actions";

export function LoginForm({ captcha }: { captcha: Captcha }) {
  const [error, formAction, isPending] = useActionState(loginAction, undefined);

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="captchaAnswer" className="text-foreground text-sm font-medium">
          Type the digits shown
        </label>

        {/*
          The challenge is server-rendered SVG, and the digits are line
          segments rather than text — so the answer is nowhere in the markup
          for a script to read. `currentColor` keeps it legible in whatever
          palette a client has chosen; an unreadable captcha is an outage.

          dangerouslySetInnerHTML is safe here: the markup is built by
          lib/captcha.ts from generated digits and random coordinates, with no
          user input anywhere in it.
        */}
        <div
          className="border-border bg-background text-foreground flex justify-center rounded-lg border py-2"
          dangerouslySetInnerHTML={{ __html: captcha.svg }}
        />

        <input type="hidden" name="captchaToken" value={captcha.token} />
        <input
          id="captchaAnswer"
          name="captchaAnswer"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          required
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
        <p className="text-muted-foreground text-xs">
          This is here to stop automated sign-in attempts.{" "}
          {/* A real navigation, not next/link, and deliberately so: the captcha is
              minted on the server for this request, so getting a different one
              means asking the server again. A soft navigation to the route you
              are already on will not do that.

              eslint-disable-next-line is for a rule regression, not for the
              pattern: eslint-config-next 16.3.5 flags this (three times over,
              on one line) where 16.3.0 did not. The upgrade was forced by the
              critical Next.js Windows RCE advisory, so it is not revertible. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/login" className="underline">
            Show a different one
          </a>
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
