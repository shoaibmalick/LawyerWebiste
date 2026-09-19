import { z } from "zod";
import { optionalPhoneSchema } from "@/lib/phone";

export const quoteRequestSchema = z
  .object({
    serviceSlug: z.string().min(1),
    selections: z.record(z.string(), z.union([z.boolean(), z.number()])),
    name: z.string().min(1).max(200),
    email: z.email(),
    // Was z.string().max(30), which is not a phone number — it is thirty
    // characters of anything, and `<a href=//evil.test>Pay</a>` fits in
    // twenty-eight. The shared schema is the same one the booking and contact
    // forms use, so there is one format across the site rather than one per
    // form. The field stays optional; a format is not a requirement to supply
    // a value.
    phone: optionalPhoneSchema,
  })
  // Unknown keys are a caller telling us something we did not ask for. Every
  // other public schema here is strict; this one was not.
  .strict();

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
