import { buttonVariants } from "@/components/ui/button";
import type { SiteConfig } from "@/config/schema/site.schema";
import { cn } from "@/lib/utils";

type ContactCTAProps = {
  business: SiteConfig["business"];
};

export function ContactCTA({ business }: ContactCTAProps) {
  return (
    <section id="contact" className="border-border bg-primary/5 border-t">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-6 py-20">
        <h2 className="text-foreground text-3xl font-semibold tracking-tight">Visit us</h2>
        <p className="text-muted-foreground">
          {business.address.street}, {business.address.city}, {business.address.state}{" "}
          {business.address.zip}
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={`tel:${business.phone}`} className={cn(buttonVariants({ size: "lg" }))}>
            Call {business.phone}
          </a>
          <a
            href={`mailto:${business.email}`}
            className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
          >
            Email us
          </a>
        </div>
      </div>
    </section>
  );
}
