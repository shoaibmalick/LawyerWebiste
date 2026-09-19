import { z } from "zod";

export const signupSchema = z
  .object({
    name: z.string().min(1).max(200),
    // Lower-cased before it reaches the database, which holds a case-sensitive
    // unique index on this column. Without it, `Jane@example.com` slips past the
    // taken-email check, creates a *second* row, and then the owner cannot sign
    // in unless they reproduce the exact capitalisation their browser autofilled
    // that day. auth.ts and createBookingSchema normalise the same way.
    email: z
      .email()
      .transform((value) => value.toLowerCase())
      .pipe(z.email()),
    password: z.string().min(8).max(100),
  })
  .strict();

export type SignupInput = z.infer<typeof signupSchema>;
