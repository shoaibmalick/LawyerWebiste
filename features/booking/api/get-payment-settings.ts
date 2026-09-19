import { settingsService } from "@/server/services/settingsService";

export async function getPaymentSettings() {
  return settingsService.getPaymentSettings();
}
