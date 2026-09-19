"use client";

import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useChatbot } from "../hooks/use-chatbot";

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, state, sendMessage } = useChatbot();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    await sendMessage(text);
  }

  if (!open) {
    return (
      /*
       * A disc, not the "Chat with us" pill it used to be.
       *
       * The launcher is fixed to the viewport, so it clears the page's content
       * only where the gutter is wider than the launcher: at the site's
       * max-w-6xl (1152px) that is 1442px of viewport for the 121px pill, but
       * 1296px for a 48px disc. Below that it floats over the page whatever
       * shape it is — that is what floating means — but it covers a quarter as
       * much of it.
       *
       * It was measured covering the footer's legal links at 390, 1024 and
       * 1280, "Image credits" among them, which is the link that makes the
       * photographers' attribution reachable. `SiteFooter` now reserves room at
       * the foot of the page as well; both halves are needed, because padding
       * alone does nothing about the middle of a page.
       *
       * `z-30` sits under the header's `z-40` deliberately: the open panel is
       * 28rem tall and would otherwise cross the sticky header on a short
       * viewport.
       */
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Chat with us"
        title="Chat with us"
        className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 fixed right-6 bottom-6 z-30 flex size-12 items-center justify-center rounded-full shadow-lg transition-colors focus-visible:ring-3 focus-visible:outline-none"
      >
        <MessageCircle aria-hidden className="size-5" />
      </button>
    );
  }

  return (
    <div className="border-border bg-background fixed right-6 bottom-6 z-30 flex h-[28rem] w-80 max-w-[calc(100vw-3rem)] flex-col rounded-xl border shadow-lg">
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <span className="text-foreground text-sm font-medium">Chat</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted-foreground text-sm"
        >
          Close
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">Ask us anything about our services.</p>
        )}
        {messages.map((message, index) => (
          <p
            key={index}
            className={
              message.role === "user"
                ? "text-foreground bg-secondary ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm"
                : "text-foreground border-border mr-auto max-w-[85%] rounded-lg border px-3 py-2 text-sm"
            }
          >
            {message.content}
          </p>
        ))}
        {state.status === "sending" && <p className="text-muted-foreground text-sm">Typing…</p>}
        {state.status === "error" && <p className="text-destructive text-sm">{state.message}</p>}
      </div>

      <form onSubmit={handleSubmit} className="border-border flex gap-2 border-t p-3">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message…"
          className="border-border bg-background flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={state.status === "sending"}>
          Send
        </Button>
      </form>
    </div>
  );
}
