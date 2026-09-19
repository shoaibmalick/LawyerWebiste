import { NextResponse } from "next/server";
import { quoteRequestSchema, submitQuoteRequest } from "@/features/quote-calculator";
import { guardPublicPost, validationError } from "@/lib/api-guards";
import { isFeatureEnabled } from "@/lib/features";

export async function POST(request: Request) {
  // Before the guard, so a disabled feature costs a caller nothing and gives
  // away nothing — a 404 that consumed a rate-limit slot would confirm the
  // route exists.
  if (!isFeatureEnabled("quoteCalculator")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // This route used to hand-roll its preamble and was the one public POST of
  // eight that did. It keyed its limiter on the raw x-forwarded-for header
  // (a caller-supplied string, so a fresh quota per request), never checked
  // Content-Type (so an attacker's `enctype="text/plain"` form was a simple
  // request the browser would send with the visitor's cookies), capped no
  // body size, and called request.json() unguarded, turning malformed input
  // into a 500.
  const guard = await guardPublicPost(request, { limitKey: "quote", max: 5 });
  if (!guard.ok) return guard.response;

  const parsed = quoteRequestSchema.safeParse(guard.body);
  if (!parsed.success) {
    // Not parsed.error.issues — that array names every field, its type and
    // its constraints to an unauthenticated caller.
    return validationError("Invalid quote request.", parsed.error);
  }

  try {
    const result = await submitQuoteRequest(parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to calculate a quote for that service." },
      { status: 400 },
    );
  }
}
