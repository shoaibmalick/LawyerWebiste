import { Button } from "@/components/ui/button";
import { imageCredits } from "@/config/content/image-credits";
import { siteConfig } from "@/config/site.config";
import { themePresetSummaries } from "@/config/theme.presets";
import {
  diagnoseStripeConfig,
  getPaymentSettings,
  StripeSettingsForm,
  setPaymentTimingAction,
} from "@/features/booking";
import { EmailSettingsForm, getEmailSettings } from "@/features/email-settings";
import { BusinessSettingsForm, getActiveThemePreset, ThemePicker } from "@/features/site-settings";
import { listTeam, TeamEditor } from "@/features/team";
import { isFeatureEnabled } from "@/lib/features";
import { siteSettingsService } from "@/server/services/siteSettingsService";
import { requireAdmin } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

/**
 * Everything about the website the client controls itself.
 *
 * Ungated, unlike the payments-only page this replaced: the theme and team
 * sections always apply, so gating the whole route on `payments` made it a
 * 404 in any client that doesn't take deposits. The payments block keeps its
 * own gate inside, and getPaymentSettings stays behind it so a payments-off
 * client never touches that table.
 *
 * Deliberately no `siteSettings` feature flag: featuresConfigSchema is bare
 * booleans with no defaults, so adding one would hard-fail
 * `featuresConfig.parse` in every client repo that hasn't merged it yet.
 * Bookings and Leads are ungated too, so an ungated Settings hub is
 * consistent.
 */
export default async function SettingsPage() {
  // Middleware is a redirect convenience, not the gate. proxy.ts matches
  // /dashboard/:path* and redirects, but Next.js has a documented
  // middleware-authorisation-bypass class (CVE-2025-29927) and a matcher is a
  // routing rule rather than a property of this page. requireAdmin asserts
  // role === "admin", so a signed-in *customer* — a valid session on the same
  // Auth.js instance — fails it here even if it reached this far.
  await requireAdmin();

  const paymentsEnabled = isFeatureEnabled("payments");

  const [themePreset, settings, team, emailSettings, paymentSettings, stripeConfig] =
    await Promise.all([
      getActiveThemePreset(),
      siteSettingsService.getSettings(),
      listTeam(),
      getEmailSettings(),
      paymentsEnabled ? getPaymentSettings() : Promise.resolve(null),
      // Same gate as the row above: a payments-off client never reads the
      // settings table, and the JSX below can then branch on the data instead of
      // asking the flag a second time.
      paymentsEnabled ? diagnoseStripeConfig() : Promise.resolve(null),
    ]);

  async function saveTiming(formData: FormData) {
    "use server";
    const timing = formData.get("timing");
    if (timing === "UPFRONT" || timing === "AFTER_SERVICE") {
      await setPaymentTimingAction(timing);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-foreground text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Website configuration. Changes here go live on the public site immediately.
        </p>
      </div>

      <ThemePicker active={themePreset} presets={themePresetSummaries()} />

      <BusinessSettingsForm
        stored={{
          phone: settings.businessPhone ?? "",
          email: settings.businessEmail ?? "",
          addressStreet: settings.addressStreet ?? "",
          addressCity: settings.addressCity ?? "",
          addressState: settings.addressState ?? "",
          addressZip: settings.addressZip ?? "",
          addressCountry: settings.addressCountry ?? "",
          // Passed through untouched; get-business re-validates on read, and
          // the form falls back to the configured week when this is null.
          hours:
            (settings.openingHours as { day: string; opens: string; closes: string }[]) ?? null,
        }}
        fallback={siteConfig.business}
      />

      <TeamEditor
        members={team}
        // Only the licences that legally compel a visible credit. Everything
        // else on the credits page is listed as a courtesy and carries no
        // consequence if a photo is swapped out.
        attributionRequiredSrcs={imageCredits
          .filter((credit) => credit.attributionRequired)
          .map((credit) => credit.src)}
      />

      <EmailSettingsForm settings={emailSettings} />

      {paymentSettings && (
        <section className="border-border flex flex-col gap-8 rounded-lg border p-5">
          <div>
            <h2 className="text-foreground text-lg font-medium">Payments</h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Controls when customers pay for services with a deposit configured (see
              config/content/services.ts). This only affects services that have a deposit amount
              set.
            </p>
          </div>
          {stripeConfig && <StripeSettingsForm config={stripeConfig} />}

          <div className="border-border border-t pt-6">
            <h3 className="text-foreground font-medium">When customers pay</h3>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Applies to services with a deposit amount set.
            </p>
          </div>

          <form action={saveTiming} className="flex max-w-md flex-col gap-4">
            <label className="border-border flex items-start gap-3 rounded-lg border p-4 text-sm">
              <input
                type="radio"
                name="timing"
                value="UPFRONT"
                defaultChecked={paymentSettings.timing === "UPFRONT"}
                className="mt-1"
              />
              <span>
                <span className="text-foreground block font-medium">
                  Collect deposit online at booking
                </span>
                <span className="text-muted-foreground">
                  Customer pays via Stripe before the booking is confirmed (e.g. a gym charging at
                  signup).
                </span>
              </span>
            </label>
            <label className="border-border flex items-start gap-3 rounded-lg border p-4 text-sm">
              <input
                type="radio"
                name="timing"
                value="AFTER_SERVICE"
                defaultChecked={paymentSettings.timing === "AFTER_SERVICE"}
                className="mt-1"
              />
              <span>
                <span className="text-foreground block font-medium">
                  Collect payment in person after the visit
                </span>
                <span className="text-muted-foreground">
                  Booking confirms immediately with no online charge; mark it paid from the Bookings
                  tab once collected (e.g. a dental office charging at checkout).
                </span>
              </span>
            </label>
            <Button type="submit">Save</Button>
          </form>
        </section>
      )}
    </div>
  );
}
