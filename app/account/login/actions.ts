"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { clientIp } from "@/lib/client-ip";
import { checkLoginThrottle, describeRetryWait } from "@/lib/login-throttle";

export async function customerLoginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  // Same throttle and the same key as the admin form — see app/login/actions.ts
  // for why enforcement lives in auth.ts and only the message lives here.
  const throttle = checkLoginThrottle(`login:${clientIp(await headers())}`);
  if (throttle.throttled) {
    return `Too many sign-in attempts. Please try again ${describeRetryWait(
      throttle.retryAfterSeconds,
    )}.`;
  }

  try {
    await signIn("customer", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/account",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }
}
