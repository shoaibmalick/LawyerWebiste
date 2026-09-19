import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

/**
 * The checks every public POST route runs before it looks at a body.
 *
 * These five routes (booking, leads, reviews, chatbot, customer signup) had
 * the same four-line rate-limit preamble copy-pasted into each, and the same
 * three gaps in each. Doing it once means a fix lands everywhere at the same
 * time instead of in four places and then the fifth six months later.
 */

/**
 * 100 KB. Comfortably more than any form here sends — the largest is a review
 * comment — and small enough that a hostile body is rejected before it is
 * parsed rather than after.
 */
const DEFAULT_MAX_BODY_BYTES = 100 * 1024;

type GuardOptions = {
  /** Namespace for the limiter key, e.g. "leads". */
  limitKey: string;
  max?: number;
  windowMs?: number;
  maxBodyBytes?: number;
};

type GuardResult = { ok: true; body: unknown } | { ok: false; response: NextResponse };

function tooMany(retryAfterSeconds: number, message: string): NextResponse {
  return NextResponse.json(
    { error: message },
    // Retry-After turns "try again shortly" into something a client can act
    // on, and is what a well-behaved caller reads before retrying.
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function guardPublicPost(
  request: Request,
  { limitKey, max = 5, windowMs = 60_000, maxBodyBytes = DEFAULT_MAX_BODY_BYTES }: GuardOptions,
): Promise<GuardResult> {
  // Rate limit first, so that malformed and hostile requests count against the
  // sender too. Checking cheaper things first would let an attacker probe
  // indefinitely as long as every probe was rejected before the limiter.
  const ip = clientIp(await headers());
  const limit = rateLimit(`${limitKey}:${ip}`, { max, windowMs });
  if (!limit.success) {
    return {
      ok: false,
      response: tooMany(limit.retryAfterSeconds, "Too many requests, please try again shortly."),
    };
  }

  /**
   * Require JSON, and mean it.
   *
   * `request.json()` parses the body whatever the Content-Type says, which
   * made these routes writable cross-origin: a form with
   * `enctype="text/plain"` on an attacker's page is a *simple* request, so the
   * browser sends it with the visitor's cookies and no preflight. Slot ids are
   * public via GET /api/booking/slots, so that was enough to create bookings
   * and leads in a visitor's name.
   *
   * Demanding `application/json` is not on the simple-request list, so the
   * browser must preflight, and the preflight fails — there are no CORS
   * headers on this app. Same-origin fetches are unaffected: they already send
   * this header.
   */
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Expected application/json." },
        { status: 415 }, // Unsupported Media Type
      ),
    };
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }),
    };
  }

  // Read as text so an absent or lying Content-Length cannot get past the cap.
  const raw = await request.text();
  if (raw.length > maxBodyBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }),
    };
  }

  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    // Previously this threw out of the handler and Next answered 500 — a
    // client error reported as a server error, and noise in whatever watches
    // the error rate.
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

/**
 * A validation failure, without handing back Zod's `issues` array.
 *
 * The full array names every field, its expected type and its constraints —
 * a free description of the server's data model for an unauthenticated
 * caller. The first message is what a form needs to show; the rest was only
 * ever useful to someone mapping the API.
 */
export function validationError(message: string, error: ZodError): NextResponse {
  const first = error.issues.at(0);
  return NextResponse.json(
    { error: message, detail: first?.message ?? "Invalid input." },
    { status: 400 },
  );
}
