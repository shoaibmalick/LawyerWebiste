import { NextResponse } from "next/server";
import { askChatbot, chatRequestSchema } from "@/features/ai-chatbot";
import { guardPublicPost, validationError } from "@/lib/api-guards";
import { isFeatureEnabled } from "@/lib/features";

export async function POST(request: Request) {
  if (!isFeatureEnabled("aiChatbot")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // A chat turn carries the conversation history, so it is legitimately the
  // largest body the site posts — but it still has no business being large.
  const guard = await guardPublicPost(request, { limitKey: "chatbot", max: 10 });
  if (!guard.ok) return guard.response;

  const parsed = chatRequestSchema.safeParse(guard.body);
  if (!parsed.success) {
    return validationError("Invalid message.", parsed.error);
  }

  const reply = await askChatbot(parsed.data);
  return NextResponse.json({ reply });
}
