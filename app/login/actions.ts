"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { verifyCaptcha } from "@/lib/captcha";
import { clientIp } from "@/lib/client-ip";
import { checkLoginThrottle, describeRetryWait, recordLoginFailure } from "@/lib/login-throttle";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  /**
   * Enforcement for both of these lives in auth.ts's `authorize`, because that
   * is the only point both routes into a session pass through — this action
   * and the Auth.js endpoint at POST /api/auth/callback/admin, which proxy.ts
   * does not match.
   *
   * The checks here exist so the *message* is honest. Without them a throttled
   * attempt and a mistyped captcha are both reported as "invalid email or
   * password", and the person most likely to see that is a receptionist who
   * knows perfectly well the password is right.
   */
  const source = `login:${clientIp(await headers())}`;

  const throttle = checkLoginThrottle(source);
  if (throttle.throttled) {
    return `Too many sign-in attempts. Please try again ${describeRetryWait(
      throttle.retryAfterSeconds,
    )}.`;
  }

  // `consume: false` — authorize() is the one that spends the nonce. If this
  // burned it, the real check moments later would see a replay and every
  // sign-in would fail. See lib/captcha.ts.
  const captcha = verifyCaptcha(
    formData.get("captchaToken")?.toString(),
    formData.get("captchaAnswer")?.toString(),
    { consume: false },
  );

  if (captcha !== "ok") {
    // A wrong captcha counts as a failed attempt. Otherwise a bot could sit
    // here forever guessing passwords with a deliberately blank captcha and
    // never trip the throttle, which would hand back the very hole this is
    // closing.
    recordLoginFailure(source);

    if (captcha === "expired" || captcha === "replayed") {
      return "That code has expired — a new one is shown below. Please try again.";
    }
    return "The code didn't match the digits shown. Please try again.";
  }

  try {
    await signIn("admin", {
      email: formData.get("email"),
      password: formData.get("password"),
      captchaToken: formData.get("captchaToken"),
      captchaAnswer: formData.get("captchaAnswer"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }
}
