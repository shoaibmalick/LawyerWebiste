import { z } from "zod";

/**
 * Feature flags, all defaulted.
 *
 * ## Why every field carries `.default(false)`
 *
 * These were bare booleans with no defaults, and that made the schema a trap:
 * adding a seventh flag here hard-failed `featuresConfig.parse` at module load
 * in every client repo that had not yet merged it. Not a type error at build
 * time — a crash on the next page render, in a repo nobody had touched.
 *
 * `config/schema/theme.schema.ts` had already learned this and defaults
 * everything it added for exactly this reason. This file had not, and it was
 * the highest-risk thing in the config layer the moment a second vertical
 * existed.
 *
 * So: a new flag defaults to **off**. A client that has not merged it keeps
 * parsing and keeps behaving as it did, and turning the feature on stays a
 * deliberate act in that client's own `features.config.ts`.
 */
export const featuresConfigSchema = z.object({
  booking: z.boolean().default(false),
  quoteCalculator: z.boolean().default(false),
  reviews: z.boolean().default(false),
  payments: z.boolean().default(false),
  customerAccounts: z.boolean().default(false),
  aiChatbot: z.boolean().default(false),
  /**
   * The practice-area CMS at /dashboard/practice-areas.
   *
   * Off means the admin route 404s *and* the public pages read straight from
   * config, ignoring any rows already in PracticeAreaOverride. That second half
   * matters: a flag that only hides the editor would leave whatever was last
   * saved silently in force, which is the opposite of what turning a feature off
   * means.
   */
  practiceAreasCms: z.boolean().default(false),
});

export type FeaturesConfig = z.infer<typeof featuresConfigSchema>;
export type FeatureFlag = keyof FeaturesConfig;
