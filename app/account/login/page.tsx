import { notFound } from "next/navigation";
import Link from "next/link";
import { isFeatureEnabled } from "@/lib/features";
import { CustomerLoginForm } from "./login-form";

export default function AccountLoginPage() {
  if (!isFeatureEnabled("customerAccounts")) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Sign in</h1>
        <CustomerLoginForm />
        <p className="text-muted-foreground text-sm">
          No account yet?{" "}
          <Link href="/account/signup" className="text-primary underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
