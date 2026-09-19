import { ChatWidget } from "@/features/ai-chatbot";
import { isFeatureEnabled } from "@/lib/features";

export function Chatbot() {
  if (!isFeatureEnabled("aiChatbot")) {
    return null;
  }

  return <ChatWidget />;
}
