import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/blocks/page-header";
import { siteConfig } from "@/config/site.config";

/**
 * The three legal pages, from one template.
 *
 * They share a shape - a title, a deck, and a series of headed sections of
 * prose - and nothing about them benefits from three separate files that drift
 * apart in styling. The copy lives in the map below, where it can be read end
 * to end.
 *
 * The disclaimer is the one that carries real weight. A demo site for a
 * fictional firm, publishing pages that name real statutes and real limitation
 * periods, needs somewhere unambiguous to say so.
 */
export const dynamicParams = false;

type LegalDoc = {
  title: string;
  deck: string;
  sections: { heading: string; body: string[] }[];
};

const FIRM = siteConfig.business.legalName ?? siteConfig.business.name;

const DOCS = {
  disclaimer: {
    title: "Disclaimer",
    deck: `${FIRM} is a fictional firm. This website is a design demonstration, and nothing on it is legal advice.`,
    sections: [
      {
        heading: "This firm does not exist",
        body: [
          `${FIRM}, its address, its telephone number and its email address are invented for the purposes of a website design demonstration. No such firm is in practice, no lawyer named on this site is real, and no one can be retained through it.`,
          "The site is deliberately excluded from search engines for this reason, and its structured data is configured to refuse to publish the firm's details to a live production deployment.",
        ],
      },
      {
        heading: "Nothing here is legal advice",
        body: [
          "The practice-area pages describe legal services in general terms and reference real statutes, limitation periods and procedures in Canada and the United States. They are written to demonstrate what a law firm's website content looks like. They are not advice, they are not a substitute for advice, and they may be out of date.",
          "Law differs between provinces and between states, and changes over time. A limitation period, a filing deadline or a notice requirement that applies to one person's circumstances may not apply to yours. If you have a legal problem, speak to a lawyer licensed in your jurisdiction.",
        ],
      },
      {
        heading: "No solicitor-client or attorney-client relationship",
        body: [
          "Reading this site, submitting the contact form, or booking a consultation through it does not create a solicitor-client relationship (Canada) or an attorney-client relationship (United States). No such relationship exists unless and until it is confirmed in a signed engagement letter.",
          "Because no relationship is created, information sent through this site is not privileged and should not be treated as confidential. Do not send anything sensitive or time-critical through it.",
        ],
      },
      {
        heading: "No representation about outcomes",
        body: [
          "Nothing on this site is a promise, guarantee or prediction about the outcome of any matter. Past results, where described, would not indicate future results. The content has been written to avoid claims of that kind, consistent with the advertising rules of the Law Society of Ontario and of US state bars.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy",
    deck: "What this demonstration site collects, and what happens to it.",
    sections: [
      {
        heading: "What is collected",
        body: [
          "If you submit the contact form, the site stores the name, email address, telephone number and message you provide, together with the practice area you selected. If you book a consultation, it stores the slot you chose alongside those details.",
          "The site applies rate limiting to its public forms, which involves briefly processing the IP address the request arrives from. That value is used to count requests and is not stored against your submission.",
        ],
      },
      {
        heading: "What it is used for",
        body: [
          "This is a demonstration. Submissions exist so that the administrative side of the site has something to display, and they are visible to whoever operates the demonstration. Nobody will act on a legal matter described in one, because the firm is fictional.",
          "Please do not enter real personal information, and in particular do not describe an actual legal problem, an actual injury, or anything you would not want a stranger to read.",
        ],
      },
      {
        heading: "Cookies and tracking",
        body: [
          "The public pages set no analytics or advertising cookies and load no third-party trackers. A session cookie is set only if you sign in to the administrative area.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of use",
    deck: "The terms on which this demonstration site is made available.",
    sections: [
      {
        heading: "Purpose",
        body: [
          "This site exists to demonstrate the design and structure of a law firm website. It is provided as-is, without warranty of any kind, and may be changed or withdrawn at any time.",
        ],
      },
      {
        heading: "Accuracy",
        body: [
          "The content describes real areas of law but is written for illustration. It is not maintained against legislative change and should not be relied on. See the disclaimer for the full position.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Do not use the forms on this site to submit unlawful content, to attempt to disrupt the service, or to send anyone else's personal information.",
        ],
      },
      {
        heading: "Content ownership",
        body: [
          "The written content and design of this site are the work of its authors. Where third-party photography is used, it is credited on the image credits page under the terms of its licence.",
        ],
      },
    ],
  },
} as const satisfies Record<string, LegalDoc>;

type DocSlug = keyof typeof DOCS;

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

type Params = { params: Promise<{ doc: string }> };

function lookup(doc: string): LegalDoc | undefined {
  return DOCS[doc as DocSlug];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { doc } = await params;
  const entry = lookup(doc);
  if (!entry) return {};

  return {
    title: `${entry.title} | ${siteConfig.business.name}`,
    description: entry.deck,
    alternates: { canonical: `/legal/${doc}` },
  };
}

export default async function LegalPage({ params }: Params) {
  const { doc } = await params;
  const entry = lookup(doc);
  if (!entry) notFound();

  return (
    <main className="flex-1">
      <PageHeader
        eyebrow="Legal"
        title={entry.title}
        deck={entry.deck}
        crumbs={[{ label: "Home", href: "/" }, { label: entry.title }]}
      />

      <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="space-y-10">
          {entry.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-foreground text-xl font-semibold tracking-tight">
                {section.heading}
              </h2>
              {section.body.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 40)}
                  className="text-muted-foreground mt-3 leading-relaxed text-pretty"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
