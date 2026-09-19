"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useSignup } from "../hooks/use-signup";
import { signupSchema, type SignupInput } from "../schema/customer.schema";

export function SignupForm() {
  const { state, submit } = useSignup();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  });

  if (state.status === "success") {
    // Worded so it is true either way. The server answers identically whether
    // the address was new or already registered — telling the form which it
    // was would hand back the account-enumeration oracle the API no longer
    // gives out. Someone who already had an account gets an email saying so.
    return (
      <p className="text-foreground text-sm">
        You&rsquo;re all set —{" "}
        <Link href="/account/login" className="text-primary underline">
          sign in
        </Link>{" "}
        to view your bookings.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-foreground text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          {...register("name")}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-foreground text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register("email")}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-foreground text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          {...register("password")}
          className="border-border bg-background rounded-lg border px-3 py-2 text-sm"
        />
        {errors.password && <p className="text-destructive text-xs">{errors.password.message}</p>}
      </div>

      {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}

      <Button type="submit" disabled={isSubmitting || state.status === "submitting"}>
        {isSubmitting || state.status === "submitting" ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
