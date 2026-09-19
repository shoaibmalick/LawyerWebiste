import Image from "next/image";

import { buttonVariants } from "@/components/ui/button";
import type { SiteConfig } from "@/config/schema/site.schema";
import { isFeatureEnabled } from "@/lib/features";
import { cn } from "@/lib/utils";

type HeroProps = {
  business: SiteConfig["business"];
};

export function Hero({ business }: HeroProps) {
  const primaryCta = isFeatureEnabled("booking")
    ? { label: "Book an appointment", href: "#booking" }
    : { label: "Visit us", href: "#contact" };

  const { heroImage } = business;

  return (
    <section className="border-border bg-secondary/30 border-b">
      <div
        className={cn(
          "mx-auto max-w-5xl gap-10 px-6 py-24",
          heroImage && "grid items-center lg:grid-cols-2",
        )}
      >
        <div className="flex flex-col items-start gap-6">
          <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
            {business.tagline}
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg">{business.description}</p>
          <div className="flex flex-wrap gap-3">
            <a href={primaryCta.href} className={cn(buttonVariants({ size: "lg" }))}>
              {primaryCta.label}
            </a>
            <a
              href={`tel:${business.phone}`}
              className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
            >
              Call {business.phone}
            </a>
          </div>
        </div>
        {heroImage && (
          // Decorative: the headline beside it already carries the meaning, so
          // an empty alt keeps screen readers from announcing a redundant image.
          <div className="border-border bg-muted relative aspect-4/3 w-full overflow-hidden rounded-2xl border">
            <Image
              src={heroImage}
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
    </section>
  );
}
