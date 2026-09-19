import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import { getBusiness } from "@/features/site-settings";

// See the note in booking/success: every page inherited the site title.
export const metadata: Metadata = {
  title: `Booking not completed — ${siteConfig.business.name}`,
  robots: { index: false, follow: true },
};

export default async function BookingCancelledPage() {
  const business = await getBusiness();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">Payment cancelled</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Your appointment wasn&apos;t confirmed since the deposit wasn&apos;t completed. No charge
        was made — feel free to try booking again, or call {business.name} at {business.phone}.
      </p>
      <Link href="/" className="text-primary text-sm underline">
        Back to homepage
      </Link>
    </main>
  );
}
