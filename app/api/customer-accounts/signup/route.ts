import { NextResponse } from "next/server";
import { signUpCustomer, signupSchema } from "@/features/customer-accounts";
import { guardPublicPost, validationError } from "@/lib/api-guards";
import { isFeatureEnabled } from "@/lib/features";

export async function POST(request: Request) {
  if (!isFeatureEnabled("customerAccounts")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guard = await guardPublicPost(request, { limitKey: "customer-signup", max: 5 });
  if (!guard.ok) return guard.response;

  const parsed = signupSchema.safeParse(guard.body);
  if (!parsed.success) {
    return validationError("Invalid signup details.", parsed.error);
  }

  // One response either way — see signUpCustomer for why. Returning 409 on a
  // duplicate told anyone who asked whether a given person is a patient here.
  await signUpCustomer(parsed.data);
  return NextResponse.json({ success: true }, { status: 201 });
}
