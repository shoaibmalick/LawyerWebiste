"use client";

import { useState } from "react";
import type { ChatMessage } from "../schema/chat.schema";

type ChatbotState =
  { status: "idle" } | { status: "sending" } | { status: "error"; message: string };

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<ChatbotState>({ status: "idle" });

  async function sendMessage(text: string) {
    const history = messages;
    setMessages([...history, { role: "user", content: text }]);
    setState({ status: "sending" });

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.";
        setState({ status: "error", message });
        return;
      }

      setMessages((current) => [...current, { role: "assistant", content: body.reply }]);
      setState({ status: "idle" });
    } catch {
      setState({ status: "error", message: "Network error. Please try again." });
    }
  }

  return { messages, state, sendMessage };
}
