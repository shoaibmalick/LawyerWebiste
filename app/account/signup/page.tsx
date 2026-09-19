import { notFound } from "next/navigation";
import { SignupForm } from "@/features/customer-accounts";
import { isFeatureEnabled } from "@/lib/features";

export default function AccountSignupPage() {
  if (!isFeatureEnabled("customerAccounts")) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Create an account</h1>
        <SignupForm />
      </div>
    </main>
  );
}
