import { z } from "zod";

export const chatMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })
  .strict();

export const chatRequestSchema = z
  .object({
    message: z.string().min(1).max(2000),
    // Prior turns, oldest first — capped to keep the request bounded and cheap.
    history: z.array(chatMessageSchema).max(20).optional(),
  })
  .strict();

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
