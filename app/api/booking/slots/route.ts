import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/features/booking";
import { isFeatureEnabled } from "@/lib/features";

export async function GET() {
  if (!isFeatureEnabled("booking")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const slots = await getAvailableSlots();
  return NextResponse.json({ slots });
}
