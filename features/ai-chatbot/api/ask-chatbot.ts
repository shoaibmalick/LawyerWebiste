import { listTeam } from "@/features/team";
import { anthropic } from "@/lib/anthropic";
import type { ChatRequestInput } from "../schema/chat.schema";
import { buildSystemPrompt } from "./build-system-prompt";

const FALLBACK_REPLY =
  "Sorry, chat isn't available right now — please call us or use the contact form below.";

export async function askChatbot(input: ChatRequestInput): Promise<string> {
  if (!anthropic) {
    console.warn("[ai-chatbot] ANTHROPIC_API_KEY not set — returning fallback reply");
    return FALLBACK_REPLY;
  }

  try {
    // Read per request rather than at module load: the practice can edit its
    // roster from the dashboard, and a prompt built once at boot would keep
    // introducing people who have left.
    const team = await listTeam();

    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system: buildSystemPrompt(team),
      output_config: { effort: "low" },
      messages: [
        ...(input.history ?? []).map((turn) => ({ role: turn.role, content: turn.content })),
        { role: "user" as const, content: input.message },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.type === "text" ? textBlock.text : FALLBACK_REPLY;
  } catch (error) {
    console.error("[ai-chatbot] Anthropic API call failed:", error);
    return FALLBACK_REPLY;
  }
}
