// GENERATED FILE - DO NOT EDIT BY HAND.
//
// Source: BusinessToBusinessContent.md
// Regenerate: npm run content:generate
//
// The markdown is the authored copy (specification.md 4.1). Edit it there and
// re-run the generator; an edit made here is lost on the next run and, worse,
// puts the published page out of step with the copy everyone reviews.

import { practiceAreasSchema } from "@/config/schema/practice-area.schema";

export const practiceAreas = practiceAreasSchema.parse([
  {
    slug: "corporate-commercial",
    audience: "business",
    name: "Corporate & Commercial Law",
    tagline: "Entity structure, contracts and deals that work on both sides of the border.",
    overview:
      "Most cross-border problems began as a structuring decision made years earlier. Harbourline advises founders, general counsel and CFOs on where to incorporate, how to paper revenue, and what a US or Canadian buyer will test in diligence. Our Toronto and New York lawyers work from a single matter file, so a CBCA subsidiary and a Delaware parent are designed together rather than reconciled after closing. The result is a corporate record that survives a financing, an audit and an exit.",
    icon: "building-2",
    order: 1,
    seo: {
      title: "Corporate & Commercial Lawyers | Canada and the US",
      description:
        "Cross-border corporate counsel from Toronto and New York. Entity structuring, commercial contracts, M&A and governance handled as one file, not two silos.",
    },
    services: [
      {
        slug: "business-formation-structuring",
        name: "Business Formation & Structuring",
        summary:
          "Select the entity and jurisdiction that match your tax position, investor base and risk tolerance in both countries.",
        description:
          "Entity choice sets your tax bill, your investor pool and your personal exposure for the life of the business. We weigh Delaware and state-law vehicles against CBCA and OBCA corporations, model how a Nova Scotia unlimited liability company behaves for a US parent, and build the holding structure before the first dollar of revenue lands.",
        keyFeatures: [
          "Entity comparison across LLC, C-Corp, S-Corp, CBCA and OBCA",
          "Articles, by-laws and shareholder agreements for both jurisdictions",
          "Founder share allocation, vesting and rollover planning",
          "Extra-provincial and foreign qualification registrations filed",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question:
              "Should I incorporate federally under the CBCA or provincially under the OBCA?",
            answer:
              "It depends on where you operate and who sits on your board. A CBCA corporation gets nationwide name protection but must have resident Canadian directors making up at least twenty-five percent of the board. Ontario dropped its residency requirement in 2021, so an OBCA corporation can have an entirely non-resident board, which often suits US founders opening a Canadian arm.",
          },
          {
            question: "Can a US company own a Canadian subsidiary?",
            answer:
              "Yes. US parents commonly hold a Canadian subsidiary directly or through an unlimited liability company, which Canada treats as a corporation while the US can treat it as a disregarded entity or partnership. The right answer turns on your treaty position and your exit plan, so we model it with your tax advisors before anything is filed.",
          },
          {
            question: "Do I need a Canadian resident director to incorporate in Canada?",
            answer:
              "Not always. Federal CBCA corporations need resident Canadian directors for at least a quarter of the board, or one director where the board has fewer than four. Ontario, British Columbia and several other provinces impose no residency requirement at all, so the province of incorporation is frequently chosen around board composition rather than geography.",
          },
        ],
        relatedSlugs: [
          "commercial-contract-drafting",
          "mergers-acquisitions-joint-ventures",
          "corporate-governance-compliance",
        ],
        cta: "Structure your entity the right way",
        icon: "file-signature",
        seo: {
          title: "Business Formation & Entity Structuring | US and Canada",
          description:
            "Choose the entity and jurisdiction that fit your tax, investor and liability profile. Delaware, LLC, CBCA and OBCA structures designed together from day one.",
        },
      },
      {
        slug: "commercial-contract-drafting",
        name: "Contract Drafting, Review & Negotiation",
        summary:
          "Turn commercial understandings into agreements that allocate risk clearly and survive scrutiny in Ontario and US courts.",
        description:
          "A contract earns its keep on the worst day of the relationship, not the first. We draft and negotiate the agreements that carry your revenue, then pressure-test the clauses that actually get litigated: governing law, limitation of liability, indemnity, termination and change of control. Templates are built once and localized for each jurisdiction rather than rewritten deal by deal.",
        keyFeatures: [
          "Master service agreements and statements of work",
          "Vendor, supplier, reseller and distribution agreements",
          "Mutual NDAs and enforceable restrictive covenant packages",
          "Liability caps, indemnities and insurance requirement drafting",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Should my contract be governed by Ontario law or New York law?",
            answer:
              "Pick the law of the place where you are most likely to enforce. New York law is familiar to US counterparties and lenders; Ontario law is usually the practical choice when your counterparty, assets or receivables sit in Canada. What matters more than the label is pairing the governing law with a forum and dispute clause that actually lets you collect.",
          },
          {
            question: "Are non-compete clauses enforceable in Canada and the United States?",
            answer:
              "The answer differs sharply. Ontario prohibits employment non-competes under the Employment Standards Act, with narrow exceptions for executives and the sale of a business. In the US, enforceability is state by state, and California, Minnesota, Oklahoma and North Dakota bar them outright. Well-drafted non-solicitation and confidentiality terms usually carry more weight in both countries.",
          },
          {
            question: "Does a limitation of liability clause actually hold up?",
            answer:
              "Usually, if it is clear, mutual and not buried. Courts in both countries enforce negotiated caps between commercial parties, but will read exclusions narrowly and may decline to apply them to fraud, wilful misconduct or personal injury. Canadian courts assess whether enforcement would be unconscionable, so a cap that is wildly disproportionate to the fee invites challenge.",
          },
        ],
        relatedSlugs: [
          "business-formation-structuring",
          "mergers-acquisitions-joint-ventures",
          "corporate-governance-compliance",
        ],
        cta: "Put your commercial terms on solid ground",
        icon: "file-text",
        seo: {
          title: "Commercial Contract Drafting & Negotiation | US and CA",
          description:
            "MSAs, vendor terms, distribution and NDAs drafted for Canadian and US counterparties, with governing law, liability caps and remedies that hold up in court.",
        },
      },
      {
        slug: "mergers-acquisitions-joint-ventures",
        name: "Mergers, Acquisitions & Joint Ventures",
        summary:
          "Guide buyers, sellers and JV partners through diligence, deal documents and regulatory clearance in both countries.",
        description:
          "Deal value leaks in diligence gaps and regulatory surprises. We run buy-side and sell-side transactions end to end, structure share versus asset deals around tax and liability outcomes, and flag the filings that set your timeline before the letter of intent is signed. Joint ventures get the same discipline: governance, deadlock and exit mechanics drafted while everyone still agrees.",
        keyFeatures: [
          "Share and asset purchase agreements with tailored indemnity packages",
          "Legal, corporate and regulatory due diligence programs",
          "HSR and Competition Act merger notification analysis",
          "Joint venture, earn-out and shareholder exit mechanics",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "When does a cross-border deal need antitrust or competition clearance?",
            answer:
              "Two separate tests apply. US Hart-Scott-Rodino notification is triggered by a transaction size threshold that the FTC adjusts annually, with a size-of-person test layered on for mid-range deals. Canada requires pre-merger notification when both a transaction-size threshold of C$93 million and a party-size threshold of C$400 million are met, and the Competition Bureau can review deals below those lines.",
          },
          {
            question:
              "Does the Investment Canada Act apply when a US buyer acquires a Canadian business?",
            answer:
              "Almost always, in one of two ways. Smaller acquisitions require only a post-closing notification. Larger ones, and any investment touching cultural business or national security, can require a net benefit review or a security review before closing. Timelines and undertakings for a reviewable transaction are material to your deal schedule, so we assess this at the term sheet stage.",
          },
          {
            question: "Is a share deal or an asset deal better for a cross-border acquisition?",
            answer:
              "Buyers generally prefer asset deals for the clean liability break and stepped-up basis; sellers usually prefer share deals for capital gains treatment, including the Canadian lifetime capital gains exemption. Cross-border, the answer often flips because of withholding tax, treaty benefits and the need to keep permits and customer contracts that would not survive assignment.",
          },
        ],
        relatedSlugs: [
          "business-formation-structuring",
          "commercial-contract-drafting",
          "corporate-governance-compliance",
        ],
        cta: "Move your transaction toward closing",
        icon: "handshake",
        seo: {
          title: "Cross-Border M&A and Joint Venture Lawyers | US and CA",
          description:
            "Buy-side and sell-side counsel for cross-border deals, from diligence and purchase agreements to HSR and Competition Act clearance and post-closing integration.",
        },
      },
      {
        slug: "corporate-governance-compliance",
        name: "Corporate Governance & Compliance",
        summary:
          "Keep boards, records and statutory filings current so financings and exits are not delayed by cleanup.",
        description:
          "Governance failures rarely announce themselves. They surface when a lender or acquirer asks for the minute book and finds three years of unpassed resolutions. We serve as outside corporate secretary, maintain registers in both countries, and give directors practical guidance on fiduciary duties, conflicts and the decisions that belong in a resolution rather than an email thread.",
        keyFeatures: [
          "Outside corporate secretary and minute book maintenance",
          "Board and committee charters, resolutions and conflict protocols",
          "Individuals with significant control and beneficial ownership registers",
          "Annual returns, extra-provincial filings and franchise tax compliance",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "What beneficial ownership records does my company have to keep?",
            answer:
              "Canadian federal corporations must maintain a register of individuals with significant control and file it with Corporations Canada, where certain fields are publicly searchable. Ontario requires the register to be maintained but not filed. In the US, FinCEN narrowed the Corporate Transparency Act in 2025 so that reporting obligations now fall mainly on foreign companies registered to do business there.",
          },
          {
            question: "What happens if our minute book has not been updated in years?",
            answer:
              "It becomes a closing condition. Buyers and lenders will hold back funds or delay signing until share issuances, director changes and annual resolutions are documented. Reconstructing a record is possible in both countries using rectification resolutions and, where needed, a court or registry application, but it costs far more under deal pressure than it does beforehand.",
          },
          {
            question: "Do directors of a Canadian subsidiary face personal liability?",
            answer:
              "More than most US directors expect. Canadian directors can be held personally liable for up to six months of unpaid employee wages, for unremitted source deductions and GST or HST, and for certain environmental obligations. Indemnity agreements, directors and officers insurance, and disciplined resolution practice are the standard mitigations we put in place. ---",
          },
        ],
        relatedSlugs: [
          "business-formation-structuring",
          "commercial-contract-drafting",
          "mergers-acquisitions-joint-ventures",
        ],
        cta: "Bring your corporate record up to date",
        icon: "landmark",
        seo: {
          title: "Corporate Governance & Compliance Counsel | US and CA",
          description:
            "Board advisory, minute books, beneficial ownership registers and annual filings kept current in Canada and the US so diligence never stalls your financing.",
        },
      },
    ],
  },
  {
    slug: "intellectual-property",
    audience: "business",
    name: "Intellectual Property",
    tagline: "Protect, license and enforce the assets that carry your enterprise value.",
    overview:
      "Your code, brands, designs and data are usually the most valuable thing on the balance sheet and the least documented. Harbourline builds portfolios that map to commercial strategy rather than filing volume, coordinating CIPO and USPTO prosecution so protection lands where you actually sell. We also handle the unglamorous half: chain of title, assignment gaps and moral rights waivers that stop a diligence process cold.",
    icon: "lightbulb",
    order: 2,
    seo: {
      title: "Intellectual Property Lawyers | Canada and the US",
      description:
        "Patent, trademark, copyright and trade secret counsel coordinated across CIPO and the USPTO, from first filing through licensing and enforcement strategy.",
    },
    services: [
      {
        slug: "patent-drafting-prosecution",
        name: "Patent Drafting & Prosecution",
        summary:
          "Convert inventions into enforceable patent rights in the markets where your product will actually compete.",
        description:
          "A patent is a commercial instrument, so the filing plan should follow the revenue plan. We assess patentability, draft claims with an eye to how competitors will design around them, and manage prosecution before both CIPO and the USPTO. PCT filings are used to keep options open while your market data catches up to your engineering roadmap.",
        keyFeatures: [
          "Prior art searches and freedom-to-operate assessments",
          "Utility, design and industrial design application drafting",
          "Patent prosecution and office action responses",
          "PCT filing and national phase entry management",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Does a US patent protect my invention in Canada?",
            answer:
              "No. Patent rights are territorial, so a granted US patent gives you nothing against a Canadian manufacturer or importer. You need a separate Canadian application, filed directly with CIPO or through the PCT national phase. Most clients who sell in both markets file a US provisional, then use the PCT route to preserve Canadian and other foreign rights.",
          },
          {
            question: "How long do I have to file after publicly disclosing my invention?",
            answer:
              "Both Canada and the US give inventors a twelve-month grace period for their own disclosures, which is more forgiving than Europe, China and most of the world, where any public disclosure before filing is usually fatal. If international protection matters, treat your first public demo, pitch deck or paper as a hard deadline and file before it.",
          },
          {
            question: "What is the difference between a patent agent and a patent lawyer?",
            answer:
              "Agents are registered to prosecute applications before CIPO or the USPTO based on technical and examination credentials. Lawyers advise on ownership, licensing, validity, infringement risk and litigation. Complex portfolios usually need both, which is why we pair registered agent work on the filings with counsel on the commercial and enforcement decisions around them.",
          },
        ],
        relatedSlugs: [
          "trademark-brand-protection",
          "copyright-licensing-enforcement",
          "trade-secret-protection-ndas",
        ],
        cta: "Map your patent filing strategy",
        icon: "scroll-text",
        seo: {
          title: "Patent Drafting & Prosecution | CIPO and USPTO Filings",
          description:
            "Patentability searches, application drafting and office action responses before CIPO and the USPTO, with PCT strategy aligned to where you plan to sell.",
        },
      },
      {
        slug: "trademark-brand-protection",
        name: "Trademark Registration & Brand Protection",
        summary:
          "Secure and police your brand across both markets before someone else registers the name you built.",
        description:
          "Brand disputes are almost always cheaper to prevent than to win. We run clearance before you commit to packaging and domains, file in Canada and the US on a coordinated schedule, and use the Madrid Protocol where it saves time and cost. Enforcement covers marketplace takedowns, opposition proceedings and demand letters calibrated to the commercial outcome you want.",
        keyFeatures: [
          "Clearance searches and brand availability risk opinions",
          "CIPO, USPTO and Madrid Protocol application filings",
          "Opposition, objection and cancellation proceedings",
          "Marketplace monitoring, takedowns and licensee quality control",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Do I have to be using my trademark before I can register it in Canada?",
            answer:
              "No. Canada removed the use-at-filing requirement in 2019, so a CIPO application does not need a declaration of use. The US still requires either actual use or a bona fide intent to use, backed by specimens before registration issues. Use still matters in Canada, because an unused mark can be attacked through summary cancellation proceedings.",
          },
          {
            question: "Does my US trademark registration cover Canada?",
            answer:
              "It does not. Trademark rights are national, and a US registration gives you no automatic protection against a Canadian applicant for the same mark. Canada operates on a first-to-file basis with limited protection for prior unregistered use, so a US brand expanding north should file with CIPO early rather than waiting for its first Canadian sale.",
          },
          {
            question: "How long does trademark registration take in each country?",
            answer:
              "Expect a meaningful difference. USPTO examination typically moves within several months of filing. CIPO examination has run considerably longer in recent years, and a straightforward Canadian application can take a few years to reach registration. That backlog is a practical reason to file in Canada well ahead of a launch rather than alongside it.",
          },
        ],
        relatedSlugs: [
          "patent-drafting-prosecution",
          "copyright-licensing-enforcement",
          "trade-secret-protection-ndas",
        ],
        cta: "Clear and register your brand",
        icon: "badge-check",
        seo: {
          title: "Trademark Registration & Brand Protection | CIPO, USPTO",
          description:
            "Clearance searches, CIPO and USPTO filings, Madrid Protocol strategy and enforcement work that keeps your brand defensible as you expand across the border.",
        },
      },
      {
        slug: "copyright-licensing-enforcement",
        name: "Copyright Licensing & Enforcement",
        summary:
          "Own, license and enforce the code, content and designs your business depends on and sells.",
        description:
          "Copyright problems usually trace back to paperwork, not piracy. Contractors who never signed assignments, moral rights that were never waived, open source pulled into a shipping product. We audit chain of title, build licensing terms that match your revenue model, and run enforcement through the right channel in each country.",
        keyFeatures: [
          "Software, SaaS and content licensing agreements",
          "Chain of title audits and contractor assignment remediation",
          "DMCA takedowns and Canadian notice-and-notice enforcement",
          "Open source compliance reviews and remediation plans",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Can I get infringing content taken down in Canada the way I can in the US?",
            answer:
              "Not through the same mechanism. The US DMCA obliges a host to remove content once it receives a compliant notice. Canada uses a notice-and-notice regime, where the intermediary must forward your notice to the subscriber but has no obligation to remove anything. Meaningful removal in Canada generally requires platform terms of service or a court order.",
          },
          {
            question: "Does my company own work created by contractors?",
            answer:
              "Only with a written assignment. In both countries an employee's work in the course of employment generally belongs to the employer, but an independent contractor keeps copyright unless they assign it in writing. Canada adds a trap for US buyers: moral rights cannot be assigned and must be expressly waived, so a bare US-style assignment clause leaves a gap.",
          },
          {
            question: "Do I need to register copyright to enforce it?",
            answer:
              "In the US, effectively yes. Registration is a precondition to filing an infringement suit, and timely registration unlocks statutory damages and attorney fees. In Canada, copyright arises automatically and registration is optional, though a CIPO registration creates a useful presumption of ownership and validity that shortens arguments in enforcement proceedings.",
          },
        ],
        relatedSlugs: [
          "patent-drafting-prosecution",
          "trademark-brand-protection",
          "trade-secret-protection-ndas",
        ],
        cta: "Lock down your content rights",
        icon: "copyright",
        seo: {
          title: "Copyright Licensing & Enforcement | Canada and the US",
          description:
            "Software and content licensing, ownership and assignment audits, DMCA takedowns and Canadian notice-and-notice enforcement handled in one coordinated plan.",
        },
      },
      {
        slug: "trade-secret-protection-ndas",
        name: "Trade Secret Protection & NDAs",
        summary:
          "Protect algorithms, formulas and customer data with controls that stand up when an employee leaves.",
        description:
          "Trade secret protection is a program, not a document. Courts in both countries ask what reasonable steps you took, so access controls, labelling and exit interviews matter as much as the NDA. We help you identify what genuinely qualifies, restrict it properly, and respond quickly when information walks out the door with a departing employee or vendor.",
        keyFeatures: [
          "Trade secret identification, classification and access mapping",
          "Enterprise NDA templates for vendors, staff and investors",
          "Onboarding and departure protocols with exit certifications",
          "Rapid-response injunction and preservation strategy",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Is trade secret law the same in Canada and the United States?",
            answer:
              "No. The US Defend Trade Secrets Act gives owners a federal civil claim with nationwide reach, layered over state statutes. Canada has no equivalent federal civil statute, so claims rest on breach of confidence at common law, contract, and criminal provisions added to the Criminal Code. Practically, that makes your written agreements and internal controls more load-bearing in Canada.",
          },
          {
            question: "What counts as reasonable steps to protect a trade secret?",
            answer:
              "Courts look for evidence, not intention. That means role-based access rather than open shared drives, confidentiality marking, NDAs with every party who sees the material, logging and monitoring, and a documented offboarding process. Companies that can produce an access log and a signed exit certification are in a far stronger position than those relying on a policy nobody enforced.",
          },
          {
            question: "An employee left for a competitor with our client list. What can we do?",
            answer:
              "Move quickly and preserve evidence first: device images, access logs and email forwarding records. In the US, a DTSA claim can support an ex parte seizure order in narrow circumstances. In Canada, the usual route is an urgent injunction for breach of confidence and fiduciary duty. Both depend on showing prompt action and concrete harm. ---",
          },
        ],
        relatedSlugs: [
          "patent-drafting-prosecution",
          "trademark-brand-protection",
          "copyright-licensing-enforcement",
        ],
        cta: "Protect your confidential information",
        icon: "key-round",
        seo: {
          title: "Trade Secret Protection & NDA Counsel | US and Canada",
          description:
            "Identify, classify and defend confidential information with enforceable NDAs, access controls and departure protocols that work under DTSA and Canadian law.",
        },
      },
    ],
  },
  {
    slug: "employment-labour",
    audience: "business",
    name: "Employment & Labour Law (Management Side)",
    tagline: "Management-side counsel for workforces spread across Canadian and US jurisdictions.",
    overview:
      "Employers running teams in both countries are managing two different legal cultures at once. US at-will employment sits beside Canadian reasonable notice; the FLSA sits beside provincial Employment Standards Acts. Harbourline advises boards, founders and HR leaders on contracts, terminations, labour relations and compliance, with the goal of reducing claims rather than reacting to them. We write policies your managers can actually apply.",
    icon: "users",
    order: 3,
    seo: {
      title: "Employment & Labour Lawyers for Employers | US and CA",
      description:
        "Management-side employment counsel for cross-border employers, covering contracts, terminations, union relations and wage, hour and workplace safety compliance.",
    },
    services: [
      {
        slug: "employment-agreements-policies",
        name: "Employment Agreements & Workplace Policies",
        summary:
          "Put enforceable employment contracts and workplace policies in place in every jurisdiction before a hire becomes a dispute.",
        description:
          "A termination clause drafted for Delaware will not survive an Ontario court, and an Ontario handbook will not satisfy a California employee. We build a single employment framework with jurisdiction-specific modules, so executives, contractors and distributed staff are all covered by documents that hold up where they actually work.",
        keyFeatures: [
          "Executive agreements with equity, bonus and change of control terms",
          "Termination clauses drafted to survive Ontario judicial scrutiny",
          "Multi-state and multi-province employee handbook modules",
          "Remote work, expense and contractor classification policies",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Can I use my US employment agreement for Canadian employees?",
            answer:
              "Not without significant revision. Ontario courts void an entire termination provision if any part of it falls below Employment Standards Act minimums, which means the employee reverts to common law reasonable notice that can run many months. At-will language, unlimited probation periods and US-style non-competes are all common sources of that failure.",
          },
          {
            question: "How much notice do I owe a Canadian employee on termination?",
            answer:
              "Two layers apply. The Employment Standards Act sets a statutory floor of roughly one week per year of service up to eight weeks in Ontario, plus severance pay for larger employers. If the contract does not validly limit entitlement, common law reasonable notice applies instead and is measured in months, weighing age, service, role and comparable job availability.",
          },
          {
            question: "Are employment non-competes still usable?",
            answer:
              "Rarely, and less every year. Ontario prohibits them for most employees under the Employment Standards Act, with narrow carve-outs for senior executives and sale-of-business situations. Several US states ban them outright and others restrict them by salary threshold. Carefully scoped non-solicitation, confidentiality and IP assignment terms do most of the protective work now.",
          },
        ],
        relatedSlugs: [
          "wrongful-dismissal-defense",
          "union-relations-collective-bargaining",
          "wage-hour-safety-compliance",
        ],
        cta: "Strengthen your employment documents",
        icon: "clipboard-list",
        seo: {
          title: "Employment Agreements & Workplace Policies | US and CA",
          description:
            "Executive contracts, termination clauses and handbooks built for US at-will and Canadian statutory rules, so your documents hold when a departure turns hostile.",
        },
      },
      {
        slug: "wrongful-dismissal-defense",
        name: "Discrimination, Harassment & Wrongful Dismissal Defense",
        summary:
          "Defend employee claims of discrimination, harassment and wrongful dismissal in both Canadian and US forums.",
        description:
          "The first two weeks of a claim usually decide its cost. We conduct or oversee workplace investigations, assess exposure against the relevant statute rather than instinct, and negotiate separations that close the file cleanly. Where a matter has to be defended, we appear before administrative tribunals and civil courts in both countries.",
        keyFeatures: [
          "Independent workplace harassment and misconduct investigations",
          "Defense before the EEOC, state agencies and human rights tribunals",
          "Severance modelling and enforceable release agreements",
          "Constructive dismissal and reprisal risk assessments",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Where do employee discrimination claims get filed in Canada versus the US?",
            answer:
              "The forums differ. US employees typically file with the EEOC or a state fair employment agency before suing, and must exhaust that process first. In Ontario, applications go directly to the Human Rights Tribunal of Ontario without a filing fee and without a monetary cap, though awards are generally more modest. Federally regulated Canadian employers face a separate commission process.",
          },
          {
            question: "What is constructive dismissal and why does it matter more in Canada?",
            answer:
              "Constructive dismissal occurs when an employer unilaterally changes a fundamental term such as pay, role or location, letting the employee treat the relationship as ended and claim full notice. Because Canadian notice entitlements are measured in months, a demotion or compensation change made without consent creates far greater exposure than the equivalent move for a US at-will employee.",
          },
          {
            question: "Is a signed release always enforceable?",
            answer:
              "Not automatically. US releases of federal age discrimination claims must meet specific timing and revocation requirements. In Canada, a release can be set aside where the employee received no consideration beyond statutory minimums, was denied a chance to get advice, or signed under pressure. Structuring consideration above the statutory floor is what makes the document durable.",
          },
        ],
        relatedSlugs: [
          "employment-agreements-policies",
          "union-relations-collective-bargaining",
          "wage-hour-safety-compliance",
        ],
        cta: "Respond to an employee claim",
        icon: "shield-alert",
        seo: {
          title: "Wrongful Dismissal & Discrimination Defense for Employers",
          description:
            "Defend employers before the EEOC, state agencies, human rights tribunals and the courts, with investigations and severance strategy that contain exposure early.",
        },
      },
      {
        slug: "union-relations-collective-bargaining",
        name: "Union Relations & Collective Bargaining",
        summary:
          "Manage certification drives, bargaining rounds and day-to-day grievances lawfully across both US and Canadian labour regimes.",
        description:
          "Labour relations reward preparation. We support employers through organizing campaigns, first contracts and renewal bargaining, and we train managers on what they can lawfully say and do before a mistake becomes an unfair labour practice. Where disputes reach arbitration or a labour board, we handle the hearing as well as the strategy behind it.",
        keyFeatures: [
          "Collective agreement negotiation and costing support",
          "Union organizing response and management training",
          "Grievance arbitration and labour board proceedings",
          "Strike, lockout and business continuity planning",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How does union certification differ between Canada and the US?",
            answer:
              "Timelines are the biggest gap. NLRB certification in the US normally runs through a secret ballot election with a campaign period. Canadian provincial boards move much faster, and several jurisdictions allow card-based certification without any vote once membership support crosses a threshold. Employers with Canadian operations often have days, not weeks, to respond appropriately.",
          },
          {
            question: "What can our managers say during an organizing campaign?",
            answer:
              "Less than most US-trained managers assume, especially in Canada. Both regimes permit factual, non-coercive communication and both prohibit threats, interrogation, surveillance and promises of benefit. Canadian boards apply the restrictions strictly and can order remedial certification without a vote where employer conduct has tainted the process, which makes manager training the practical safeguard.",
          },
          {
            question: "Can we use replacement workers during a strike?",
            answer:
              "It depends on jurisdiction. US employers generally may hire replacements, subject to reinstatement rules that differ for economic and unfair labor practice strikes. In Canada, British Columbia and Quebec ban replacement workers, and federally regulated employers now face a similar prohibition, so contingency planning for a Canadian site looks very different from a US one.",
          },
        ],
        relatedSlugs: [
          "employment-agreements-policies",
          "wrongful-dismissal-defense",
          "wage-hour-safety-compliance",
        ],
        cta: "Prepare for your next bargaining round",
        icon: "megaphone",
        seo: {
          title: "Union Relations & Collective Bargaining Counsel | US, CA",
          description:
            "Bargaining support, certification response and grievance arbitration before the NLRB and provincial labour relations boards, with lawful manager training.",
        },
      },
      {
        slug: "wage-hour-safety-compliance",
        name: "Wage, Hour & Workplace Safety Compliance",
        summary:
          "Audit classification, overtime and safety practices before a regulator or class action finds the gap.",
        description:
          "Wage and hour exposure compounds quietly across a payroll cycle, then arrives as a class action or a ministry order. We audit exempt and non-exempt classifications, reconcile overtime thresholds that differ by jurisdiction, and build health and safety programs that satisfy both OSHA and provincial regulators. Pay transparency obligations are folded into the same review.",
        keyFeatures: [
          "FLSA exempt and non-exempt classification reviews",
          "Provincial Employment Standards Act overtime and hours audits",
          "OSHA and provincial occupational health and safety programs",
          "Pay transparency and pay equity posting compliance",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "When does overtime start in Canada compared with the US?",
            answer:
              "The thresholds are not the same. The FLSA requires overtime after forty hours in a workweek for non-exempt employees, with some states adding daily overtime. Ontario's Employment Standards Act sets the weekly threshold at forty-four hours, and other provinces use different weekly and daily triggers. A national payroll rule applied across both countries will get one of them wrong.",
          },
          {
            question: "Does OSHA apply to our Canadian locations?",
            answer:
              "No. OSHA has no jurisdiction in Canada. Canadian workplaces are regulated provincially, or federally for sectors such as banking, telecom and interprovincial transport. Provincial regimes run on an internal responsibility system with joint health and safety committees, worker refusal rights and mandatory incident reporting, so a US safety manual needs a Canadian counterpart rather than a translation.",
          },
          {
            question: "Do we have to publish salary ranges in job postings?",
            answer:
              "Increasingly, yes, in both countries. Ontario now requires compensation information in publicly advertised job postings, and several US states including Colorado, California, New York and Illinois impose comparable disclosure rules. Because the requirements vary in scope and remedy, multi-jurisdiction employers usually standardize on the strictest applicable rule for recruiting. ---",
          },
        ],
        relatedSlugs: [
          "employment-agreements-policies",
          "wrongful-dismissal-defense",
          "union-relations-collective-bargaining",
        ],
        cta: "Audit your wage and safety compliance",
        icon: "clipboard-check",
        seo: {
          title: "Wage, Hour & Workplace Safety Compliance for Employers",
          description:
            "Classification audits, overtime and pay transparency reviews, and health and safety programs built for FLSA, OSHA and provincial employment standards regimes.",
        },
      },
    ],
  },
  {
    slug: "real-estate-construction",
    audience: "business",
    name: "Real Estate & Construction Law",
    tagline:
      "Counsel for land acquisition, leasing, construction and property tax in both countries.",
    overview:
      "Real property is where capital gets tied up and where delay is most expensive. Harbourline advises owners, developers, lenders and tenants from site selection through commissioning, and stays with the asset for assessment appeals and expropriation. Canadian and US procedures diverge sharply on liens, transfer taxes and takings, so we scope every mandate to the governing regime rather than assuming symmetry.",
    icon: "hard-hat",
    order: 4,
    seo: {
      title: "Commercial Real Estate & Construction Lawyers | US, CA",
      description:
        "Zoning, leasing, acquisitions, construction contracts, lien claims, assessment appeals and expropriation counsel for owners and developers in Canada and the US.",
    },
    services: [
      {
        slug: "zoning-land-use-approvals",
        name: "Commercial Zoning, Land Use & Development Approvals",
        summary:
          "Secure the rezonings, variances and site plan approvals that unlock density, use and value for your site.",
        description:
          "Entitlements decide what a site is worth. We pursue rezonings, minor variances, consents and site plan approvals, manage the environmental and technical studies that support them, and appear before councils, committees of adjustment and land use tribunals. Where an approval is refused or stalls, we handle the appeal with the project schedule in view.",
        keyFeatures: [
          "Rezoning, variance and official plan amendment applications",
          "Site plan control and subdivision approval management",
          "Environmental assessment and technical study coordination",
          "Ontario Land Tribunal and US zoning board appeals",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How do zoning appeals work in Ontario compared with a US municipality?",
            answer:
              "Ontario funnels most planning disputes to the Ontario Land Tribunal, a provincial body that can substitute its own decision for council's. In the US, appeals usually go first to a local zoning board of appeals and then into state court on a deferential standard of review. The Ontario route is often broader but subject to tighter statutory appeal windows.",
          },
          {
            question: "What is the difference between a minor variance and a rezoning?",
            answer:
              "Scale and forum. A minor variance asks a committee of adjustment to permit a modest departure from the existing by-law, and it is faster and cheaper. A rezoning changes the permitted use or density itself and requires a council decision, public meetings and often supporting studies. Choosing the wrong instrument is a common cause of avoidable delay.",
          },
          {
            question: "How long do development approvals usually take?",
            answer:
              "Longer than pro formas assume. Straightforward variances can resolve in a few months; rezonings with public opposition, an official plan amendment or a tribunal appeal can take well over a year. The practical lever is front-loading technical studies and community consultation, because most delay comes from incomplete applications rather than contested hearings.",
          },
        ],
        relatedSlugs: [
          "commercial-leasing-acquisitions",
          "construction-contracts-lien-disputes",
          "property-tax-expropriation-disputes",
        ],
        cta: "Advance your development approvals",
        icon: "land-plot",
        seo: {
          title: "Zoning, Land Use & Development Approvals | US and Canada",
          description:
            "Rezonings, variances, site plan approvals and tribunal appeals handled with municipal staff and councils so your development timeline stays commercially viable.",
        },
      },
      {
        slug: "commercial-leasing-acquisitions",
        name: "Commercial Leasing & Property Acquisitions",
        summary:
          "Close leases and property acquisitions with title, financing and operating cost terms that protect your position.",
        description:
          "Leases and acquisitions are where small drafting choices turn into decades of operating cost. We act for landlords, tenants, buyers and lenders on industrial, office and retail assets, negotiate the recovery and escalation terms that drive net effective rent, and clear title before funds move. Cross-border portfolios get consistent documents with jurisdiction-correct mechanics.",
        keyFeatures: [
          "Triple-net, gross and industrial lease negotiation",
          "Purchase and sale agreements with diligence condition management",
          "Title review, opinion and title insurance coordination",
          "Acquisition financing, mortgage and charge documentation",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question:
              "What taxes apply when buying commercial property in Ontario versus a US state?",
            answer:
              "Ontario charges provincial land transfer tax on closing, and a property in Toronto attracts a second municipal land transfer tax on top. GST or HST may also apply to a commercial purchase, often managed through a self-assessment election. US transfer taxes vary widely by state, county and city, and several states impose none at all, so budgeting has to be jurisdiction-specific.",
          },
          {
            question: "Do I need title insurance in Canada?",
            answer:
              "It is common and usually advisable, though the reason differs. Ontario operates a land titles system where the register is generally conclusive, so title insurance mainly addresses survey issues, work orders, fraud and off-title compliance. In the US, title insurance is the standard mechanism for confirming chain of title itself, which makes it closer to mandatory in practice.",
          },
          {
            question: "Who pays for repairs and operating costs under a commercial lease?",
            answer:
              "Whatever the lease says, which is why the additional rent clause deserves more attention than the base rent. Triple-net structures push taxes, insurance and maintenance to the tenant in both countries. The negotiation that matters is the exclusion list, particularly capital replacements, management fees and the landlord's right to reallocate costs across a complex.",
          },
        ],
        relatedSlugs: [
          "zoning-land-use-approvals",
          "construction-contracts-lien-disputes",
          "property-tax-expropriation-disputes",
        ],
        cta: "Move your property transaction forward",
        icon: "building",
        seo: {
          title: "Commercial Leasing & Property Acquisitions | US and CA",
          description:
            "Landlord and tenant leasing, purchase and sale, financing and title work for industrial, office and retail assets on both sides of the Canada and US border.",
        },
      },
      {
        slug: "construction-contracts-lien-disputes",
        name: "Construction Contracts & Lien Disputes",
        summary:
          "Keep projects funded and moving through careful contract drafting, lien deadlines, statutory adjudication and delay claims.",
        description:
          "Construction disputes run on deadlines that do not forgive. We negotiate CCDC and AIA based contracts with risk allocated to the party that can control it, preserve and enforce lien rights within statutory windows, and use prompt payment and adjudication procedures to keep cash moving. Delay, deficiency and defect claims are handled with the schedule impact quantified.",
        keyFeatures: [
          "CCDC and AIA contract drafting and risk-balanced amendments",
          "Construction lien preservation, perfection and discharge",
          "Prompt payment notices and statutory adjudication support",
          "Delay, deficiency and construction defect claim management",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long do I have to register a construction lien in Ontario?",
            answer:
              "Ontario's Construction Act gives a claimant sixty days from the triggering event, such as publication of substantial performance or last supply, to preserve a lien by registration, then ninety further days to perfect it by starting an action. The deadlines are strict and generally cannot be extended, so the calendar has to be managed from the first invoice.",
          },
          {
            question: "Is a mechanics' lien the same as a construction lien?",
            answer:
              "They serve the same purpose but operate differently. The US mechanics' lien is a state-law creature with deadlines, preliminary notice requirements and priority rules that vary considerably. Ontario calls the equivalent a construction lien under the Construction Act, with a mandatory holdback, uniform provincial deadlines and a statutory trust over payments received down the contract chain.",
          },
          {
            question: "What is construction adjudication and should we use it?",
            answer:
              "Adjudication is a fast interim dispute process introduced with Ontario's prompt payment regime. A single adjudicator decides a payment dispute within a short statutory timeline, and the determination binds the parties until it is overturned by a court or arbitration. For contractors facing withheld progress payments, it is usually far quicker than litigation and preserves the relationship.",
          },
        ],
        relatedSlugs: [
          "zoning-land-use-approvals",
          "commercial-leasing-acquisitions",
          "property-tax-expropriation-disputes",
        ],
        cta: "Protect your project payment position",
        icon: "hammer",
        seo: {
          title: "Construction Contracts & Lien Dispute Lawyers | US, CA",
          description:
            "CCDC and AIA contract drafting, prompt payment and adjudication support, construction lien claims and delay and defect disputes for owners and contractors.",
        },
      },
      {
        slug: "property-tax-expropriation-disputes",
        name: "Property Tax Assessment, Expropriation & Eminent Domain Disputes",
        summary:
          "Reduce overstated property assessments and pursue full compensation when authorities take or impair your land.",
        description:
          "Property tax is one of the few operating costs an owner can actually appeal, and a taking is one of the few events that can erase a site's value overnight. We challenge assessments through the applicable review body, and we act for owners facing expropriation in Canada or eminent domain in the US, quantifying every compensable head rather than accepting the authority's first offer.",
        keyFeatures: [
          "Assessment review board and tax appeal representation",
          "Valuation, appraisal and comparable evidence development",
          "Expropriation compensation claims including injurious affection",
          "Eminent domain and inverse condemnation proceedings",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How do I appeal a commercial property assessment in Ontario?",
            answer:
              "Assessments are prepared by the Municipal Property Assessment Corporation, and a commercial owner disputes them by filing an appeal with the Assessment Review Board before the statutory deadline. The board hears valuation evidence directly. In most US states the equivalent runs through a county or municipal board of review, with a further appeal to a state tax tribunal or court.",
          },
          {
            question: "What compensation am I entitled to if my property is expropriated?",
            answer:
              "Ontario's Expropriations Act recognizes several heads: market value of the land taken, injurious affection to the remaining land, disturbance damages such as relocation and business loss, and in some cases special difficulties in relocation. US eminent domain is grounded in the constitutional requirement of just compensation, which centres on fair market value and tends to treat business losses more restrictively.",
          },
          {
            question: "Can the government take part of my property without a formal expropriation?",
            answer:
              "It happens, and there are remedies. Where construction, a road realignment or a regulation materially impairs your land without a formal taking, Canadian law may support an injurious affection claim even where no land changes hands. The US analogue is an inverse condemnation or regulatory takings claim. Both require prompt action and credible valuation evidence. ---",
          },
        ],
        relatedSlugs: [
          "zoning-land-use-approvals",
          "commercial-leasing-acquisitions",
          "construction-contracts-lien-disputes",
        ],
        cta: "Challenge your assessment or taking",
        icon: "banknote",
        seo: {
          title: "Property Tax, Expropriation & Eminent Domain Disputes",
          description:
            "Challenge overstated assessments and pursue full compensation when government takes or impairs your land, in Canadian expropriation and US eminent domain.",
        },
      },
    ],
  },
  {
    slug: "privacy-cybersecurity-technology",
    audience: "business",
    name: "Data Privacy, Cybersecurity & Technology",
    tagline: "Privacy, breach response and technology contracting for cross-border data holders.",
    overview:
      "Data obligations now follow your customers rather than your office address. A company in New York holding records on Quebec residents answers to Law 25; a Toronto company selling into California answers to the CPRA. Harbourline builds privacy and security programs that reconcile these regimes into one operating standard, and we are on call when an incident starts the notification clock.",
    icon: "shield-check",
    order: 5,
    seo: {
      title: "Data Privacy & Cybersecurity Lawyers | Canada and the US",
      description:
        "Privacy programs, breach response, AI and cloud vendor contracting and data licensing counsel built for PIPEDA, Quebec Law 25, CCPA and GDPR obligations.",
    },
    services: [
      {
        slug: "privacy-compliance-programs",
        name: "Privacy Compliance Programs",
        summary:
          "Build a single privacy program that satisfies Canadian, US and European obligations without duplicating effort.",
        description:
          "Running separate compliance tracks for each privacy law is expensive and fragile. We map your actual data flows, identify which regimes attach, and build one governance framework with jurisdiction-specific controls layered on top. That includes the privacy impact assessments Quebec requires for cross-border transfers and the consumer rights machinery California expects.",
        keyFeatures: [
          "Data mapping, inventory and cross-border transfer assessments",
          "Privacy impact assessments meeting Quebec Law 25 requirements",
          "External privacy policies, consent flows and cookie banners",
          "Privacy officer designation and internal governance frameworks",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Does PIPEDA apply to my US company?",
            answer:
              "It can. PIPEDA reaches organizations with a real and substantial connection to Canada that collect, use or disclose personal information in the course of commercial activity, regardless of where the servers sit. A US business selling to Canadian consumers, employing Canadians or processing Canadian customer data generally needs to comply, and the federal Privacy Commissioner has asserted jurisdiction on that basis.",
          },
          {
            question: "What does Quebec Law 25 require that PIPEDA does not?",
            answer:
              "Several things. Law 25 requires a designated privacy officer, a documented privacy impact assessment before transferring personal information outside Quebec, express opt-in consent before certain tracking, published governance policies, and data portability. Its administrative monetary penalties are also far more severe than anything under PIPEDA, which changes the risk calculus for any organization touching Quebec residents.",
          },
          {
            question: "We already comply with GDPR. Is that enough for Canada and the US?",
            answer:
              "It is a strong foundation but not a full answer. GDPR alignment covers most of PIPEDA's expectations and much of the CPRA's. Gaps typically appear in Quebec's transfer assessment and consent rules, in US state-specific rights such as opt-outs for sale and sharing, and in breach notification timelines that differ meaningfully from the seventy-two hour European standard.",
          },
        ],
        relatedSlugs: [
          "data-breach-response-notification",
          "saas-cloud-ai-vendor-contracting",
          "technology-transactions-data-licensing",
        ],
        cta: "Build your privacy compliance program",
        icon: "lock",
        seo: {
          title: "Privacy Compliance Programs | PIPEDA, Law 25, CCPA",
          description:
            "Build one privacy program that satisfies PIPEDA, Quebec Law 25, CCPA and CPRA and GDPR, with assessments, policies and governance your teams can operate.",
        },
      },
      {
        slug: "data-breach-response-notification",
        name: "Data Breach Response & Mandatory Notification",
        summary:
          "Manage incident response and mandatory notification across Canadian and US regimes under one privileged workstream.",
        description:
          "In a breach, the legal analysis and the technical investigation have to run together. We take the call early, structure the forensic engagement under privilege, and assess the notification threshold in every jurisdiction where affected individuals live. Then we draft the notices, manage regulator correspondence, and build the breach record you will be asked to produce later.",
        keyFeatures: [
          "Privileged forensic engagement and incident response coordination",
          "Multi-jurisdiction notification threshold and timing analysis",
          "Regulator, individual and credit agency notice drafting",
          "Breach registers and post-incident remediation planning",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "When do we have to report a data breach in Canada?",
            answer:
              "PIPEDA requires you to report to the Office of the Privacy Commissioner and notify affected individuals as soon as feasible when a breach of security safeguards creates a real risk of significant harm. There is no fixed day count, but regulators expect movement in days. You must also keep records of every breach, reportable or not, for two years.",
          },
          {
            question: "How do US breach notification deadlines compare?",
            answer:
              "They are more prescriptive and more fragmented. Every state has a notification statute, and roughly a third set a numeric deadline, commonly thirty to sixty days, while the rest require notice without unreasonable delay. Encryption safe harbours also vary. For a multi-state incident you comply with each affected person's home-state law, so the strictest clock governs.",
          },
          {
            question: "Should we call a lawyer or a forensic firm first?",
            answer:
              "Call counsel first, then retain the forensic firm through counsel. Engaging the investigator under legal direction is what gives you the strongest available claim to privilege over the report in both countries. It also means the notification analysis starts on day one, which matters when statutory clocks begin at discovery rather than at the end of the investigation.",
          },
        ],
        relatedSlugs: [
          "privacy-compliance-programs",
          "saas-cloud-ai-vendor-contracting",
          "technology-transactions-data-licensing",
        ],
        cta: "Get incident response support now",
        icon: "siren",
        seo: {
          title: "Data Breach Response & Notification Counsel | US and CA",
          description:
            "Privileged incident response, regulator and individual notification under PIPEDA, Law 25 and US state laws, plus the breach records regulators later ask to see.",
        },
      },
      {
        slug: "saas-cloud-ai-vendor-contracting",
        name: "SaaS, Cloud & AI Vendor Contracting",
        summary:
          "Negotiate cloud, SaaS and AI vendor agreements that control data use, residency and service quality.",
        description:
          "Vendor paper is written for the vendor, and AI terms have moved faster than most procurement templates. We negotiate the clauses that determine whether your data trains someone else's model, where it is stored, what happens in an outage, and who carries the loss when a subprocessor is breached. Security schedules are drafted to be auditable rather than aspirational.",
        keyFeatures: [
          "SaaS, cloud and subprocessor agreement negotiation",
          "AI vendor terms covering training rights, outputs and indemnities",
          "Data residency, retention and deletion commitments",
          "Service level, credit and exit assistance provisions",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Can our SaaS vendor use our data to train its AI models?",
            answer:
              "Only if your contract lets it, and many standard terms quietly do. Look for broad licences to use customer data for service improvement, which vendors often read as covering model training. If your data includes personal information or client confidential material, an express prohibition plus a deletion commitment is the clause worth spending negotiating capital on.",
          },
          {
            question: "Do we need our data stored in Canada?",
            answer:
              "Residency is rarely mandatory but is frequently contractual. PIPEDA permits transfers abroad with comparable protection and transparency, while Quebec requires a documented assessment before personal information leaves the province. Some public sector and health contracts do impose Canadian residency. The practical driver is often your own customers' requirements flowing down to you.",
          },
          {
            question:
              "What should we ask before deploying an AI tool that affects employees or customers?",
            answer:
              "Three things: what data goes in, who is accountable for outputs, and what disclosure the law requires. Ontario now requires employers to disclose the use of artificial intelligence to screen applicants in publicly advertised job postings, and US state rules on automated decision-making are expanding. Bias testing and a human review step should be contractual, not optional.",
          },
        ],
        relatedSlugs: [
          "privacy-compliance-programs",
          "data-breach-response-notification",
          "technology-transactions-data-licensing",
        ],
        cta: "Review your vendor agreements",
        icon: "cloud",
        seo: {
          title: "SaaS, Cloud & AI Vendor Contracting Lawyers | US and CA",
          description:
            "Negotiate SaaS, cloud and AI vendor agreements covering data rights, model training, residency, security and service levels that match your risk exposure.",
        },
      },
      {
        slug: "technology-transactions-data-licensing",
        name: "Technology Transactions & Data Licensing",
        summary:
          "Structure software, data and AI transactions with ownership, usage and revenue terms defined before launch.",
        description:
          "Data deals fail on ownership questions nobody asked at signing. Who owns the derived dataset, the fine-tuned model, the aggregated benchmark? We structure licensing, reseller, OEM and data-sharing arrangements so those answers are written down, and we align them with privacy obligations so a commercially attractive deal does not become a regulatory problem.",
        keyFeatures: [
          "Software, OEM, reseller and API licensing agreements",
          "Data sharing, aggregation and derived data ownership terms",
          "De-identification and anonymization standards for licensed data",
          "Source code escrow, export control and sanctions screening",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Who owns a model that was fine-tuned on our data?",
            answer:
              "Whoever the contract says, which is why silence is dangerous. Vendors often claim the resulting weights while granting you only a licence to use them. If the model encodes your proprietary data, negotiate ownership or at minimum exclusivity within your industry, plus deletion rights on termination. The same analysis applies to prompts, embeddings and evaluation datasets.",
          },
          {
            question: "Can we license or sell anonymized customer data?",
            answer:
              "Sometimes, but the standard is demanding. Properly anonymized information generally falls outside PIPEDA and most US privacy statutes, while Quebec sets out specific criteria for anonymization and treats merely de-identified data as still regulated. Because re-identification risk is assessed on the full data environment, the technical method and the contractual restrictions have to work together.",
          },
          {
            question: "Do export controls apply to software we license across the border?",
            answer:
              "They can, particularly for encryption, defence-related technology and dual-use items. The US administers the Export Administration Regulations and ITAR; Canada maintains its own export control list and sanctions regimes. Movement between Canada and the US is often eased but not exempt, so licensing terms should include screening obligations and restrictions on onward transfer. ---",
          },
        ],
        relatedSlugs: [
          "privacy-compliance-programs",
          "data-breach-response-notification",
          "saas-cloud-ai-vendor-contracting",
        ],
        cta: "Structure your technology deal",
        icon: "cpu",
        seo: {
          title: "Technology Transactions & Data Licensing | US and Canada",
          description:
            "Structure software, data and AI licensing deals with clear ownership of derived data and models, export controls and revenue terms that hold across the border.",
        },
      },
    ],
  },
  {
    slug: "commercial-litigation-dispute-resolution",
    audience: "business",
    name: "Commercial Litigation & Dispute Resolution",
    tagline:
      "Contract, shareholder, arbitration and insolvency disputes on both sides of the border.",
    overview:
      "Cross-border disputes get decided by procedure as often as by merits. Limitation periods, costs rules, discovery scope and enforcement pathways all differ between Ontario and New York, and choosing the wrong forum can cost more than the underlying claim. Harbourline litigates and arbitrates commercial disputes in both systems, and gives clients an early, candid read on whether to fight, settle or restructure.",
    icon: "gavel",
    order: 6,
    seo: {
      title: "Commercial Litigation Lawyers | Canada and the US",
      description:
        "Contract claims, shareholder and oppression disputes, arbitration and insolvency work handled in Ontario and New York courts and in cross-border proceedings.",
    },
    services: [
      {
        slug: "breach-of-contract-claims",
        name: "Breach of Contract & Commercial Tort Claims",
        summary:
          "Pursue or defend contract and commercial tort claims with an early, honest read on recovery.",
        description:
          "Litigation is a capital allocation decision. Before we file, we assess limitation periods, the realistic recovery, the collectability of the defendant and the cost exposure in the chosen forum. Where the case should be fought, we prosecute it hard; where it should not, we say so and pursue leverage through interim relief or negotiated resolution instead.",
        keyFeatures: [
          "Contract, warranty and indemnity claim prosecution and defense",
          "Negligent misrepresentation and unfair competition actions",
          "Injunctions, preservation orders and pre-judgment remedies",
          "Judgment enforcement and cross-border recognition proceedings",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long do I have to sue for breach of contract?",
            answer:
              "The gap is significant. Ontario's Limitations Act imposes a basic two-year period running from the day the claim was discovered, with a fifteen-year ultimate bar. Most US states allow four to six years for a written contract, and some allow longer. A Canadian claim can therefore expire while a US claimant on identical facts still has years to file.",
          },
          {
            question: "Who pays legal fees if we win?",
            answer:
              "This is one of the sharpest differences between the systems. Ontario follows a loser-pays model, where an unsuccessful party typically pays a substantial portion of the winner's costs, which rises further after a rejected formal offer to settle. The US generally follows the American rule, where each side bears its own fees absent a contract or statute saying otherwise.",
          },
          {
            question: "Can a US judgment be enforced against assets in Canada?",
            answer:
              "Usually, yes. Canadian courts recognize and enforce foreign money judgments where the original court had a real and substantial connection to the dispute and the process was fair. You still bring a recognition proceeding in the relevant province rather than simply registering the judgment, so enforcement should be planned for when the forum clause is drafted.",
          },
        ],
        relatedSlugs: [
          "shareholder-oppression-disputes",
          "arbitration-mediation",
          "insolvency-restructuring-creditor-remedies",
        ],
        cta: "Assess your commercial claim",
        icon: "scale",
        seo: {
          title: "Breach of Contract & Commercial Tort Litigation | US, CA",
          description:
            "Pursue and defend contract, misrepresentation and unfair competition claims in Ontario and US courts, with early strategy on forum, costs and recovery.",
        },
      },
      {
        slug: "shareholder-oppression-disputes",
        name: "Shareholder, Partnership & Oppression Remedy Disputes",
        summary:
          "Resolve deadlock, exclusion and minority shareholder disputes through oppression claims, court-ordered buyouts or negotiated exits.",
        description:
          "Internal disputes damage the business faster than any outside opponent. We act for majority and minority stakeholders in deadlock, exclusion and misappropriation cases, using the oppression remedy, derivative proceedings and buy-sell mechanics to force a resolution. Where a clean separation is achievable, we structure the valuation and exit rather than litigating to exhaustion.",
        keyFeatures: [
          "Oppression remedy applications under the CBCA and OBCA",
          "Derivative actions and leave applications on behalf of the corporation",
          "Shotgun, buy-sell and valuation dispute resolution",
          "Books and records demands and inspection proceedings",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "What is the oppression remedy and who can bring one?",
            answer:
              "It is a broad statutory claim under the CBCA and provincial acts for conduct that is oppressive, unfairly prejudicial, or unfairly disregards a complainant's interests. Shareholders, directors, officers and sometimes creditors can apply, and courts have wide discretion to order buyouts, remove directors or reverse transactions. There is no single US statute of equivalent breadth.",
          },
          {
            question: "What is the difference between an oppression claim and a derivative action?",
            answer:
              "It turns on who was harmed. Oppression addresses personal harm to the complainant that is distinct from harm to the company, and needs no court permission to start. A derivative action is brought on the corporation's behalf when the company itself was injured, and it requires leave of the court first, which adds cost and delay.",
          },
          {
            question: "Can I force the other shareholders to buy me out?",
            answer:
              "Sometimes. A shareholders agreement with shotgun or buy-sell provisions is the fastest route, and courts enforce those mechanics. Without one, a Canadian court can order a buyout as a remedy for oppression. In the US, the path is narrower and depends on the state: some allow minority shareholder buyouts or judicial dissolution, others do not.",
          },
        ],
        relatedSlugs: [
          "breach-of-contract-claims",
          "arbitration-mediation",
          "insolvency-restructuring-creditor-remedies",
        ],
        cta: "Resolve your shareholder dispute",
        icon: "users-round",
        seo: {
          title: "Shareholder, Partnership & Oppression Remedy Disputes",
          description:
            "Resolve deadlock, minority shareholder and partnership disputes through oppression claims, derivative actions, buyouts and separations in Canada and the US.",
        },
      },
      {
        slug: "arbitration-mediation",
        name: "Arbitration & Mediation",
        summary:
          "Resolve commercial disputes through arbitration or mediation, including international proceedings and the enforcement of awards abroad.",
        description:
          "Arbitration is faster and more private than court, but only when the clause was drafted properly. We advise on seat, rules, arbitrator selection and scope before the dispute, and we run the proceeding when one arises. Mediation is used deliberately rather than as a formality, including where Ontario rules make it a mandatory step.",
        keyFeatures: [
          "Arbitration clause drafting covering seat, rules and scope",
          "ICC, ICDR and ad hoc arbitration representation",
          "Mediation advocacy and settlement structuring",
          "Award recognition and enforcement across jurisdictions",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Is arbitration actually faster and cheaper than going to court?",
            answer:
              "It is usually faster and more private, and it avoids the sprawling discovery that drives US litigation cost. It is not always cheaper, because the parties pay the arbitrators and the institution. The strongest cost case is in cross-border disputes, where a single arbitration replaces parallel proceedings and produces an award that is easier to enforce internationally.",
          },
          {
            question: "Will an arbitration award be enforceable in the other country?",
            answer:
              "Generally yes. Canada and the United States are both parties to the New York Convention, so awards are recognized and enforced with limited grounds for refusal, such as invalid agreement, denial of a fair hearing or public policy. Enforcement of awards is often more straightforward across the border than enforcement of court judgments.",
          },
          {
            question: "Is mediation mandatory in Ontario commercial cases?",
            answer:
              "In several jurisdictions, yes. Ontario requires mandatory mediation in most civil actions in Toronto, Ottawa and Essex County, within a set period after the first defence is filed. US practice varies: many federal and state courts order or strongly encourage mediation, but there is no uniform national rule, so it is usually case-managed rather than automatic.",
          },
        ],
        relatedSlugs: [
          "breach-of-contract-claims",
          "shareholder-oppression-disputes",
          "insolvency-restructuring-creditor-remedies",
        ],
        cta: "Explore a faster path to resolution",
        icon: "messages-square",
        seo: {
          title: "Commercial Arbitration & Mediation Counsel | US and CA",
          description:
            "Domestic and international arbitration and mediation counsel, including ICC, ICDR and ad hoc proceedings, plus award enforcement under the New York Convention.",
        },
      },
      {
        slug: "insolvency-restructuring-creditor-remedies",
        name: "Insolvency, Restructuring & Creditor Remedies",
        summary:
          "Advise debtors and creditors through restructuring, receivership and cross-border insolvency proceedings in Canada and the US.",
        description:
          "Distress moves quickly and the first filing shapes everything that follows. We advise companies considering a restructuring and creditors trying to protect recovery, working across CCAA and BIA proceedings in Canada and Chapter 11 in the US. Cross-border cases are coordinated so the main proceeding and the recognition proceeding do not work against each other.",
        keyFeatures: [
          "CCAA and BIA proposal proceedings for Canadian debtors",
          "Chapter 11 and Chapter 15 cross-border recognition coordination",
          "Receivership applications and secured creditor enforcement",
          "Claim proofs, priority disputes and preference challenges",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "What is the difference between the CCAA and Chapter 11?",
            answer:
              "Both allow a company to restructure while operating, but the machinery differs. The CCAA applies to debtors owing more than five million dollars and is court-driven and flexible, with a licensed insolvency trustee appointed as Monitor and an initial stay of limited duration that must be extended. Chapter 11 is more codified and provides a broad automatic stay on filing.",
          },
          {
            question:
              "Our customer filed for bankruptcy in the other country. Can we still collect?",
            answer:
              "Possibly, but act immediately. Both countries have recognition regimes, Chapter 15 in the US and Part IV of the CCAA in Canada, that extend a stay across the border and freeze collection efforts. Your position depends on whether you hold security, registered it properly, and filed your claim within the deadlines set in the main proceeding.",
          },
          {
            question: "How do secured creditors enforce in Canada compared with the US?",
            answer:
              "Timing is the practical difference. Canadian secured creditors generally must give ten days' notice of intention to enforce security under the Bankruptcy and Insolvency Act before acting, and enforcement often proceeds through a court-appointed receiver. US secured parties can frequently pursue self-help remedies under Article 9 of the Uniform Commercial Code without a court order.",
          },
        ],
        relatedSlugs: [
          "breach-of-contract-claims",
          "shareholder-oppression-disputes",
          "arbitration-mediation",
        ],
        cta: "Discuss your restructuring options",
        icon: "life-buoy",
        seo: {
          title: "Insolvency, Restructuring & Creditor Remedies | US and CA",
          description:
            "Counsel for debtors and creditors in CCAA, BIA and Chapter 11 proceedings, receiverships and cross-border recognition, plus security enforcement and recovery.",
        },
      },
    ],
  },
]);
