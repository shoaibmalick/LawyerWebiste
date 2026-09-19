import { z } from "zod";

export const booleanQuoteFactorSchema = z.object({
  type: z.literal("boolean"),
  id: z.string().min(1),
  label: z.string().min(1),
  price: z.number(),
});

export const quantityQuoteFactorSchema = z.object({
  type: z.literal("quantity"),
  id: z.string().min(1),
  label: z.string().min(1),
  pricePerUnit: z.number(),
  minUnits: z.number().int().nonnegative(),
  maxUnits: z.number().int().positive(),
});

export const quoteFactorSchema = z.discriminatedUnion("type", [
  booleanQuoteFactorSchema,
  quantityQuoteFactorSchema,
]);
export type QuoteFactor = z.infer<typeof quoteFactorSchema>;

export const serviceQuoteConfigSchema = z.object({
  serviceSlug: z.string().min(1),
  factors: z.array(quoteFactorSchema),
});
export type ServiceQuoteConfig = z.infer<typeof serviceQuoteConfigSchema>;

export const quoteConfigSchema = z.array(serviceQuoteConfigSchema);
