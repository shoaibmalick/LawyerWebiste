import Anthropic from "@anthropic-ai/sdk";

// Same pattern as lib/email.ts: chat being unavailable is a soft failure
// (the widget shows a fallback message), not a hard error like payments.
export const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;
