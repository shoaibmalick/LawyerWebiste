import { NextResponse } from "next/server";
import { createLeadSchema, submitLead } from "@/features/leads";
import { guardPublicPost, validationError } from "@/lib/api-guards";
import { isLikelyBot, stripHoneypot } from "@/lib/honeypot";

export async function POST(request: Request) {
  const guard = await guardPublicPost(request, { limitKey: "leads", max: 5 });
  if (!guard.ok) return guard.response;

  const parsed = createLeadSchema.safeParse(guard.body);
  if (!parsed.success) {
    return validationError("Invalid message details.", parsed.error);
  }

  // Filled honeypot: answer exactly as if it had worked, and write nothing.
  // A 400 here would tell the operator which request gave them away.
  if (isLikelyBot(parsed.data)) {
    return NextResponse.json({ lead: null }, { status: 201 });
  }

  const lead = await submitLead(stripHoneypot(parsed.data));
  return NextResponse.json({ lead }, { status: 201 });
}
