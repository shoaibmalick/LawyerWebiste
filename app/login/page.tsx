import type { Metadata } from "next";
import { siteConfig } from "@/config/site.config";
import { createCaptcha } from "@/lib/captcha";
import { LoginForm } from "./login-form";

// noindex: a staff sign-in page has no business in search results.
export const metadata: Metadata = {
  title: `Sign in — ${siteConfig.business.name}`,
  robots: { index: false, follow: false },
};

/**
 * A fresh challenge per request, so this page can never be prerendered or
 * cached. Serving one cached captcha to everybody would mean a bot solves it
 * once and then has a valid answer for every visitor — which is exactly the
 * attack this is meant to stop.
 */
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const captcha = createCaptcha();

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Admin sign in</h1>
        <LoginForm captcha={captcha} />
      </div>
    </main>
  );
}
