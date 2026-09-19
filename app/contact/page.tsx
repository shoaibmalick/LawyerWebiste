import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Mail, Phone } from "lucide-react";
import { DemoDisclaimer } from "@/components/blocks/demo-disclaimer";
import { PageHeader } from "@/components/blocks/page-header";
import { Section, SectionHeading } from "@/components/blocks/section";
import { Reveal } from "@/components/motion/reveal";
import { CARD_SURFACE } from "@/components/ui/card-surface";
import { AUDIENCE_SEGMENT, findService } from "@/config/content/practice-areas";
import { LeadForm, PRACTICE_AREA_OPTIONS } from "@/features/leads";
import { getBusiness } from "@/features/site-settings";
import { cn } from "@/lib/utils";

/**
 * Reads the business record, which the owner can edit at /dashboard/settings.
 * That is live database state, so this page must not prerender as static.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact Harbourline Law Group",
  description:
    "Tell us what you are dealing with. We will say whether we can help and what the next step looks like. Offices in Toronto and New York.",
  alternates: { canonical: "/contact" },
};

/**
 * What happens after you press send.
 *
 * On a law firm's contact page this is the part that actually reduces the
 * friction. Someone writing in about a criminal charge or a separation is not
 * hesitating over the form fields; they are hesitating because they do not know
 * what they are starting. Three concrete steps answer that, and they cost
 * nothing to state honestly.
 */
const NEXT_STEPS = [
  {
    heading: "We read it, usually same day",
    body: "A lawyer in the relevant practice area reads what you sent, not a call centre. If it is urgent, say so in the message.",
  },
  {
    heading: "We tell you if we can help",
    body: "If your matter is outside what we do, or outside the two countries we practise in, we will say so and point you somewhere better.",
  },
  {
    heading: "You decide whether to go further",
    body: "The first conversation is free and carries no obligation. Nothing you send here creates a solicitor-client or attorney-client relationship.",
  },
] as const;

type SearchParams = { searchParams: Promise<{ service?: string }> };

export default async function ContactPage({ searchParams }: SearchParams) {
  const { service: serviceSlug } = await searchParams;
  const business = await getBusiness();

  /**
   * The slug arrives from a query string, so it is untrusted.
   *
   * Resolved against the content rather than echoed: an unknown value becomes
   * undefined and the page renders as though no service was named. Nothing
   * derived from the raw parameter reaches the page, which is what stops
   * /contact?service=<anything> from printing attacker-chosen text inside the
   * firm's own page furniture.
   *
   * The resolved value is handed to the form as `context`, and the form posts
   * it back as hidden inputs - which `submitLead` then resolves again, because
   * a hidden input is just as untrusted as a query string.
   */
  const context = serviceSlug ? findService(serviceSlug) : undefined;

  const contactMethods = [
    {
      icon: Phone,
      label: "Telephone",
      value: business.phone,
      href: `tel:${business.phone}`,
      mono: true,
    },
    {
      icon: Mail,
      label: "Email",
      value: business.email,
      href: `mailto:${business.email}`,
      mono: false,
    },
    {
      icon: CalendarClock,
      label: "Prefer to book a time?",
      value: "Book a free consultation",
      href: "/consultation",
      mono: false,
    },
  ];

  return (
    <main className="flex-1">
      <PageHeader
        eyebrow="Contact"
        title={context ? `Ask about ${context.service.name.toLowerCase()}` : "Get in touch"}
        deck={
          context
            ? context.service.summary
            : "Tell us what you are dealing with. We will say whether we can help, and what the next step looks like."
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      {/*
        Form left, everything else right, and the aside is sticky on `lg`.
        This was a `max-w-3xl` column with a 14rem rail bolted to its side, which
        gave the form less room than the page had and left the rail looking like
        an afterthought. Two real columns at `max-w-6xl` let the form use a
        two-up field grid and give the contact details somewhere to live.
      */}
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-24 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
        <div className="min-w-0">
          {context && (
            <Reveal>
              <p className="border-border bg-secondary text-secondary-foreground mb-8 rounded-lg border px-4 py-3 text-sm">
                Enquiring about{" "}
                <Link
                  href={`/${AUDIENCE_SEGMENT[context.area.audience]}/${context.area.slug}/${context.service.slug}`}
                  className="text-primary font-medium underline underline-offset-4"
                >
                  {context.service.name}
                </Link>{" "}
                in {context.area.name}. Change anything below before you send.
              </p>
            </Reveal>
          )}

          <Reveal>
            <LeadForm
              layout="wide"
              practiceAreas={PRACTICE_AREA_OPTIONS}
              context={
                context
                  ? {
                      serviceSlug: context.service.slug,
                      serviceName: context.service.name,
                      practiceAreaSlug: context.area.slug,
                      practiceAreaName: context.area.name,
                      audience: context.area.audience,
                    }
                  : undefined
              }
            />
          </Reveal>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Reveal>
            <h2 className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
              Other ways to reach us
            </h2>

            <ul className="mt-4 flex flex-col gap-3">
              {contactMethods.map((method) => (
                <li key={method.label}>
                  <Link
                    href={method.href}
                    className={cn(CARD_SURFACE, "flex items-start gap-3 p-4")}
                  >
                    <method.icon aria-hidden className="text-primary mt-0.5 size-4 shrink-0" />
                    <span className="min-w-0">
                      <span className="text-muted-foreground block text-xs">{method.label}</span>
                      <span
                        className={cn(
                          "text-foreground mt-0.5 block text-sm font-medium break-words",
                          method.mono && "font-mono",
                        )}
                      >
                        {method.value}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="border-border mt-6 rounded-lg border p-4">
              <h3 className="text-foreground text-sm font-semibold">Where we are</h3>
              <address className="text-muted-foreground mt-3 text-sm leading-relaxed not-italic">
                <span className="text-foreground block font-medium">Toronto</span>
                {business.address.street}
                <br />
                {business.address.city}, {business.address.state} {business.address.zip}
                <span className="text-foreground mt-3 block font-medium">New York</span>
                By appointment
              </address>
            </div>
          </Reveal>
        </aside>
      </div>

      {/*
        Full width, below both columns.
        These three cards started inside the form's column, which put them in
        roughly half the page beside an aside that had already run out of
        content - so they wrapped to four lines each while the right-hand side
        sat empty. They are not part of filling the form in, so they do not need
        to sit next to it.
      */}
      <Section tone="muted" className="border-border border-t">
        <SectionHeading
          eyebrow="After you send"
          title="What happens next"
          lead="Writing in is the easy part. Knowing what you have started is the part people hesitate over, so here it is."
        />

        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {NEXT_STEPS.map((step, index) => (
            <li key={step.heading}>
              <Reveal delay={index * 0.08} className="h-full">
                <div className={cn(CARD_SURFACE, "flex h-full flex-col p-6")}>
                  <span
                    aria-hidden
                    className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                  >
                    {index + 1}
                  </span>
                  <h3 className="text-foreground mt-4 text-lg font-semibold tracking-tight text-balance">
                    {step.heading}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{step.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>

        <DemoDisclaimer variant="inline" className="mt-12" />
      </Section>
    </main>
  );
}
