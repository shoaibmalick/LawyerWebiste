import { featuresConfig } from "@/config/features.config";
import type { FeatureFlag } from "@/config/schema/features.schema";

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featuresConfig[flag];
}
