import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site.config";
import { getBusiness } from "@/features/site-settings";

// Without this every page inherits the site title, so a screen-reader user
// hears the same announcement on each and a visitor with several tabs open
// cannot tell them apart. Not indexed: these are post-action pages.
export const metadata: Metadata = {
  title: `Booking confirmed — ${siteConfig.business.name}`,
  robots: { index: false, follow: true },
};

export default async function BookingSuccessPage() {
  const business = await getBusiness();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Payment received — your appointment is confirmed
      </h1>
      <p className="text-muted-foreground max-w-md text-sm">
        We&apos;ve sent a confirmation email. If you have any questions, call {business.name} at{" "}
        {business.phone}.
      </p>
      <Link href="/" className="text-primary text-sm underline">
        Back to homepage
      </Link>
    </main>
  );
}
