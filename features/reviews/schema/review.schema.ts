import { z } from "zod";
import { honeypotField } from "@/lib/honeypot";

export const createReviewSchema = z
  .object({
    authorName: z.string().min(1).max(200),
    rating: z.number().int().min(1).max(5),
    comment: z.string().min(1).max(1000),
    // Invisible spam trap — accepted, never stored. See lib/honeypot.ts.
    ...honeypotField,
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
