// GENERATED FILE - DO NOT EDIT BY HAND.
//
// Source: BusinessToCustomer.md
// Regenerate: npm run content:generate
//
// The markdown is the authored copy (specification.md 4.1). Edit it there and
// re-run the generator; an edit made here is lost on the next run and, worse,
// puts the published page out of step with the copy everyone reviews.

import { practiceAreasSchema } from "@/config/schema/practice-area.schema";

export const practiceAreas = practiceAreasSchema.parse([
  {
    slug: "personal-injury",
    audience: "individual",
    name: "Personal Injury & Torts",
    tagline: "Help after a crash, a fall, or a medical error, on either side of the border.",
    overview:
      "An injury changes your income, your health, and your household all at once. Our injury team handles the insurance paperwork, the medical evidence, and the deadlines so you can focus on getting better. Ontario and New York both run no-fault benefit systems that pay some costs no matter who caused the crash, and both put limits on when you can sue the person at fault. We explain which rules apply to you before you sign anything.",
    icon: "heart-pulse",
    order: 1,
    seo: {
      title: "Personal Injury Lawyers | Toronto and New York",
      description:
        "Hurt in Ontario or New York? Harbourline Law Group LLP handles crash, fall, malpractice and product injury claims on both sides of the Canada/US border.",
    },
    services: [
      {
        slug: "motor-vehicle-accidents",
        name: "Motor Vehicle Accident Claims",
        summary:
          "Crash claims for drivers, passengers, cyclists and pedestrians, covering both Ontario accident benefits and New York no-fault.",
        description:
          "We act for people hurt in car, truck, motorcycle, bicycle and pedestrian collisions. In Ontario your first claim is for statutory accident benefits from your own insurer, paid no matter who caused the crash; in New York the same idea is called no-fault, or PIP. Suing the at-fault driver is a separate step, and we run both tracks together.",
        keyFeatures: [
          "Accident benefit and no-fault applications filed on time",
          "Collision reconstruction, scene photos and dashcam evidence gathering",
          "Income loss, treatment and attendant care claims documented",
          "Settlement talks with insurers, and trial work when talks stall",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long do I have to sue after a car accident?",
            answer:
              "In Ontario you generally have two years from the crash to start a lawsuit, but accident benefit notice is due much sooner. Tell your own insurer within seven days and return the application form within 30 days. In New York the personal injury limit is generally three years, and the no-fault application is due within 30 days. Different rules apply to claims against a city or municipality, which can be as short as 10 days.",
          },
          {
            question: "What does a car accident lawyer cost?",
            answer:
              "Most injury files in Ontario and New York run on a contingency fee. That means you pay no fee up front, and the firm is paid a percentage of what is recovered. If nothing is recovered, no fee is charged, though you may still owe out-of-pocket expenses such as expert reports. The percentage and the expense terms go in a written agreement you sign before we start, and we walk through it line by line.",
          },
          {
            question: "Can I still claim if the crash was partly my fault?",
            answer:
              "Usually yes. Ontario and New York both reduce your award by your share of the blame rather than cancelling it. If you are found 25 percent responsible, you recover 75 percent. Ontario accident benefits are paid without regard to fault at all, so those continue either way. Do not guess at your share on the phone with an adjuster. Let us review the evidence first.",
          },
        ],
        relatedSlugs: [
          "medical-malpractice",
          "slip-and-fall-injuries",
          "product-and-drug-injuries",
        ],
        cta: "Request a free case review",
        icon: "car",
        seo: {
          title: "Car Accident Lawyers | Ontario and New York Claims",
          description:
            "Car, truck, motorcycle and pedestrian crash claims in Ontario and New York. We handle accident benefits, no-fault filings, insurers and court deadlines for you.",
        },
      },
      {
        slug: "medical-malpractice",
        name: "Medical Malpractice and Clinical Negligence",
        summary:
          "Claims against hospitals, doctors and clinics for misdiagnosis, surgical error, medication mistakes and birth injuries.",
        description:
          "Not every bad outcome is negligence, so we start by having an independent specialist read the full chart and tell us whether the care fell below the accepted standard. Only then do we advise you on a claim. Ontario doctors are defended by the Canadian Medical Protective Association, which fights these files hard, so the evidence must be solid from day one.",
        keyFeatures: [
          "Full hospital and clinic chart retrieval, then specialist review",
          "Standard-of-care and causation opinions from practising physicians",
          "Birth injury, surgical error and medication error investigations",
          "Life care cost reports for long-term treatment and support",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How do I know if I have a real malpractice case?",
            answer:
              "You need two things: care that fell below what a reasonable practitioner would have done, and proof that the shortfall caused your harm. The second part defeats many files, because a patient can be badly hurt by the illness itself. We order the records and pay for an independent specialist to read them before advising you. If the opinion does not support a claim, we tell you plainly.",
          },
          {
            question: "How long does a malpractice claim take?",
            answer:
              "These are slow files. Two to four years is common in Ontario and often longer in New York, because both sides need expert reports and examinations. Ontario generally allows two years from when you knew or ought to have known about the harm. New York generally allows two and a half years for medical malpractice, with a separate discovery rule for retained objects and some cancer misdiagnosis cases.",
          },
          {
            question: "Will I have to testify in court?",
            answer:
              "Most malpractice claims settle or are dismissed before trial, so many clients never testify in front of a judge. You will almost certainly be questioned under oath before then, called an examination for discovery in Ontario and a deposition in New York. We prepare you for that session in detail, sit beside you throughout, and no question is sprung on you without warning.",
          },
        ],
        relatedSlugs: [
          "motor-vehicle-accidents",
          "slip-and-fall-injuries",
          "product-and-drug-injuries",
        ],
        cta: "Ask for a records review",
        icon: "stethoscope",
        seo: {
          title: "Medical Malpractice Lawyers | Canada and US",
          description:
            "Misdiagnosis, surgical error and birth injury claims in Ontario and New York. Independent specialist review of the full chart, then honest advice on options.",
        },
      },
      {
        slug: "slip-and-fall-injuries",
        name: "Slip, Trip and Fall Injuries",
        summary:
          "Claims against property owners and occupiers when unsafe floors, ice, stairs or lighting cause a serious fall or assault.",
        description:
          "Owners and occupiers must keep their property reasonably safe for visitors. Ontario sets that duty out in the Occupiers Liability Act; New York applies a similar common-law duty of reasonable care. The evidence disappears fast, so we move early for security video, maintenance logs and weather records before they are overwritten.",
        keyFeatures: [
          "Security footage preserved before retention periods expire",
          "Snow clearing logs, inspection sheets and work orders obtained",
          "Ontario 60-day ice and snow notice letters sent promptly",
          "Negligent security claims for poor lighting or absent guards",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "I slipped on ice. Is there a deadline I need to know about?",
            answer:
              "Yes, and it is short. In Ontario, a claim for injury caused by snow or ice requires written notice to the occupier and the snow removal contractor within 60 days of the fall. A slip on a municipal sidewalk can require notice within 10 days. New York cities often have their own prior written notice rules. Call before those windows close, even if you are still in treatment.",
          },
          {
            question: "What should I do right after a fall?",
            answer:
              "Report it to the store, building or property manager the same day and ask for a written incident report. Photograph the hazard, the footwear you had on, and the lighting. Get names of anyone who saw it. See a doctor even if you feel able to walk away, because the medical record is the timeline that later proves when the injury started. Then call us.",
          },
          {
            question: "Does it matter that there was a warning sign?",
            answer:
              "It matters, but it is rarely the end of the case. A sign helps the occupier only if it actually gave you a fair chance to avoid the danger. A cone in the wrong aisle, or a notice you could not see from the doorway, does not discharge the duty. Ontario and New York courts both look at what a reasonable occupier should have done, not just what was posted.",
          },
        ],
        relatedSlugs: [
          "motor-vehicle-accidents",
          "medical-malpractice",
          "product-and-drug-injuries",
        ],
        cta: "Tell us what happened",
        icon: "triangle-alert",
        seo: {
          title: "Slip and Fall Injury Lawyers | Ontario and NY",
          description:
            "Injured on unsafe property in Ontario or New York? We handle ice, stair, lighting and maintenance claims against owners, landlords, stores and municipalities.",
        },
      },
      {
        slug: "product-and-drug-injuries",
        name: "Product and Prescription Drug Injuries",
        summary:
          "Claims against manufacturers and distributors for dangerous designs, manufacturing flaws, missing warnings and harmful drugs.",
        description:
          "When a product, implant or medication injures you, the claim runs against the companies that designed, made, or sold it. These cases are handled very differently on each side of the border, and we scope yours to the right forum before filing. Group proceedings are often the practical route, and we tell you honestly when joining one serves you better than suing alone.",
        keyFeatures: [
          "Design defect, manufacturing flaw and failure-to-warn analysis",
          "Product preserved and independently tested before any repair",
          "Recall notices, adverse event reports and regulator filings reviewed",
          "Class action or multidistrict group claims coordinated with co-counsel",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Is a Canadian product claim the same as a US one?",
            answer:
              "No, and the gap is real. Most US states apply strict liability, so you may not need to prove the maker was careless. Canadian courts generally require proof of negligence, usually in the design or in the warning given. Punitive damages also differ sharply: US juries sometimes award very large sums, while Canadian punitive awards are rare and modest. There is no true Canadian equivalent to US-scale punitive damages.",
          },
          {
            question: "Should I join a class action or sue on my own?",
            answer:
              "It depends on how unusual your injury is. Class actions work well when many people were harmed in much the same way. If your injuries are severe or distinctive, an individual claim may recover more. One Ontario factor to weigh is the loser-pays costs rule, which can expose an unsuccessful plaintiff to the other side's costs. We walk you through that exposure first.",
          },
          {
            question: "What should I do with the product that hurt me?",
            answer:
              "Keep it. Do not repair it, return it to the retailer, or throw out the packaging, the manual, or the remaining pills. That item is the central piece of evidence, and once it is altered the defence will say so for the rest of the case. Photograph it where it sits, store it somewhere dry and safe, and let us arrange any testing. ---",
          },
        ],
        relatedSlugs: ["motor-vehicle-accidents", "medical-malpractice", "slip-and-fall-injuries"],
        cta: "Start a product claim review",
        icon: "pill",
        seo: {
          title: "Defective Product and Drug Injury Lawyers",
          description:
            "Hurt by a defective product, device or prescription drug? We act in Ontario and New York, and explain how Canadian and US claims differ before you file.",
        },
      },
    ],
  },
  {
    slug: "family-law",
    audience: "individual",
    name: "Family Law & Domestic Relations",
    tagline:
      "Steady help through separation, parenting disputes and support in Ontario and New York.",
    overview:
      "Family cases are decided under different statutes on each side of the border, and many of our clients have a foot in both. In Canada, a divorce itself comes under the federal Divorce Act, while property division and support for unmarried partners come under provincial law such as Ontario's Family Law Act. In New York, one state statute covers all of it. We sort out which country and which court should hear your case before anything is filed.",
    icon: "users",
    order: 2,
    seo: {
      title: "Family Lawyers | Ontario and New York Divorce",
      description:
        "Divorce, parenting time, support and marriage contracts in Ontario and New York. Clear advice on the Divorce Act, the Family Law Act and cross-border cases.",
    },
    services: [
      {
        slug: "divorce-and-separation",
        name: "Divorce and Separation",
        summary:
          "Contested and uncontested divorce, separation agreements and property division for married couples and common-law partners in Ontario and New York.",
        description:
          "We start by working out where your divorce should proceed, because that choice shapes property and support outcomes. In Canada the ground for divorce is usually one year of living separate and apart, granted under the federal Divorce Act. Ontario's Family Law Act then governs how property is divided, through an equalization payment rather than a physical split of assets.",
        keyFeatures: [
          "Jurisdiction review when spouses live in different countries",
          "Ontario net family property equalization statements prepared",
          "Separation agreements with full financial disclosure exchanged",
          "Matrimonial home, pension and business valuations coordinated",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long does a divorce take?",
            answer:
              "An uncontested Ontario divorce commonly takes four to eight months after filing, and you normally must be separated a full year before the divorce is granted. New York has no-fault grounds that do not require a waiting year, and an uncontested case can conclude in roughly three to six months. Contested cases in either place run far longer, often one to two years, because disclosure and valuations take time.",
          },
          {
            question: "Do I have to go to court?",
            answer:
              "Often no. Most separations settle through negotiation, mediation or collaborative meetings, and the agreement is then filed. Even an uncontested divorce is usually processed on paper without either spouse appearing. You would attend court mainly if urgent relief is needed or a real dispute remains. We tell you at the outset which route your file is likely to take.",
          },
          {
            question: "We were never married. Do I have any property rights?",
            answer:
              "It depends where you live. In Ontario, common-law partners do not share in property automatically, no matter how long you lived together, though you may have a claim for unjust enrichment if you contributed to an asset in your partner's name. Support can still be owed after three years together, or sooner with a child. New York treats unmarried partners differently again.",
          },
        ],
        relatedSlugs: [
          "parenting-time-and-decision-making",
          "child-and-spousal-support",
          "marriage-and-cohabitation-agreements",
        ],
        cta: "Book a confidential consultation",
        icon: "heart-crack",
        seo: {
          title: "Divorce and Separation Lawyers | Canada and US",
          description:
            "Ending a marriage in Ontario or New York? We handle contested and uncontested divorce, separation agreements, property division and cross-border jurisdiction.",
        },
      },
      {
        slug: "parenting-time-and-decision-making",
        name: "Parenting Time and Decision-Making",
        summary:
          "Parenting plans, schedules, decision-making disputes and relocation cases, always measured against your child's best interests.",
        description:
          "Canada changed its vocabulary in 2021. What used to be called custody and access is now decision-making responsibility and parenting time under the Divorce Act, and the wording matters when a US order has to be recognized here. Both countries decide these cases on the best interests of the child, and we help you show what your child's day-to-day life actually needs.",
        keyFeatures: [
          "Detailed parenting plans covering school, holidays and travel",
          "Relocation notice requirements met under the Divorce Act",
          "Cross-border enforcement under the Hague Abduction Convention",
          "Voice of the Child reports and parenting assessments arranged",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Can I move to another city or country with my child?",
            answer:
              "Not without following the rules. The Divorce Act requires written notice, normally 60 days before a proposed relocation, giving the new address and a proposed schedule. The other parent then has 30 days to object. New York requires court or parental consent for a move that materially affects the other parent's time. Moving first and asking later badly damages your position in both countries.",
          },
          {
            question: "At what age can my child decide where to live?",
            answer:
              "There is no magic age in Ontario or New York. A child's views are given more weight as they mature, and a teenager's clear, independently held preference carries real influence, but no court simply hands the decision to the child. Courts weigh stability, each parent's care history, and the child's needs. Views are usually gathered through a report rather than by having the child testify.",
          },
          {
            question: "What happens if the other parent will not follow the order?",
            answer:
              "Bring it back to court rather than withholding your own obligations in response. Ontario courts can order make-up parenting time, costs, and in serious cases a change to the schedule. New York courts can find a parent in contempt. Keep a dated record of missed exchanges and messages. That log is what turns a complaint into something a judge can act on.",
          },
        ],
        relatedSlugs: [
          "divorce-and-separation",
          "child-and-spousal-support",
          "marriage-and-cohabitation-agreements",
        ],
        cta: "Talk about your parenting plan",
        icon: "baby",
        seo: {
          title: "Child Custody and Parenting Time Lawyers",
          description:
            "Parenting plans, decision-making responsibility and custody disputes in Ontario and New York, including relocation and cross-border child abduction concerns.",
        },
      },
      {
        slug: "child-and-spousal-support",
        name: "Child and Spousal Support",
        summary:
          "Setting, changing and enforcing child support and spousal support, including cases where one parent lives abroad.",
        description:
          "Child support in Canada follows the Federal Child Support Guidelines, a table based on payor income and the number of children. Spousal support is looser: the Spousal Support Advisory Guidelines give ranges only, and judges are not bound by them. The same payment is called maintenance in New York and alimony in many other states, and the formulas are not interchangeable.",
        keyFeatures: [
          "Guideline income determined, including self-employment add-backs",
          "Spousal support ranges modelled under the Advisory Guidelines",
          "Variation motions after job loss, illness or a new child",
          "Interjurisdictional enforcement through provincial and state agencies",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How is child support actually calculated?",
            answer:
              "In Canada, you look up the payor's gross annual income and the number of children in the Federal Child Support Guidelines table for the province where the payor lives. Special expenses such as childcare and orthodontics are shared on top, in proportion to income. New York uses a percentage of combined parental income, starting at 17 percent for one child. Shared parenting changes the math in both places.",
          },
          {
            question: "How long does spousal support last?",
            answer:
              "There is no fixed answer. Canada's Advisory Guidelines commonly suggest between half a year and one year of support for each year of the relationship, with indefinite support where the marriage lasted 20 years or more, or where years married plus the recipient's age reaches 65. New York uses an advisory duration range tied to the length of the marriage. Judges can depart from both.",
          },
          {
            question: "The payor lives in another country. Can I still collect?",
            answer:
              "Usually yes. Ontario has reciprocal enforcement arrangements with every US state and many other jurisdictions, so an Ontario order can be registered and enforced where the payor lives, and the reverse also works. Enforcement tools include wage garnishment, licence suspension and passport measures. It is slower than a domestic file, so start the registration early rather than after arrears build.",
          },
        ],
        relatedSlugs: [
          "divorce-and-separation",
          "parenting-time-and-decision-making",
          "marriage-and-cohabitation-agreements",
        ],
        cta: "Get your support figure reviewed",
        icon: "hand-coins",
        seo: {
          title: "Child and Spousal Support Lawyers | CA and US",
          description:
            "Support calculations, changes and enforcement in Ontario and New York, including spousal support under the Divorce Act and the provincial Family Law Act.",
        },
      },
      {
        slug: "marriage-and-cohabitation-agreements",
        name: "Marriage Contracts and Cohabitation Agreements",
        summary:
          "Agreements made before or during a relationship that set out how property and support will work if it ends.",
        description:
          "Ontario calls these domestic contracts: a marriage contract before or during marriage, a cohabitation agreement for unmarried partners. New York calls the first one a prenuptial agreement, and the test for enforceability is similar in both places: honest disclosure, independent legal advice for each partner, and no pressure. We build the file so the agreement survives a later challenge.",
        keyFeatures: [
          "Sworn financial disclosure statements exchanged before signing",
          "Independent legal advice certificates for both partners",
          "Inheritance, family business and pre-relationship asset carve-outs",
          "Review clauses triggered by children, illness or relocation",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Will a prenup actually hold up?",
            answer:
              "It holds up far more often than people assume, provided it was done properly. Ontario and New York courts set agreements aside mainly for three reasons: a partner hid assets, a partner had no independent lawyer, or the agreement was signed under pressure days before the wedding. Full disclosure, separate counsel and signing well in advance address all three. Rushed agreements are the ones that fail.",
          },
          {
            question: "Can we agree now about our children?",
            answer:
              "Not in a way that binds a court. Ontario and New York both refuse to let parents contract away a child's right to support or lock in a parenting schedule years ahead, because a judge must apply the child's best interests as they are at the time. You can record your intentions, and courts often find that helpful, but treat those clauses as guidance rather than a binding promise.",
          },
          {
            question: "Is it too late once we are already married?",
            answer:
              "No. Ontario permits a marriage contract during the marriage, and New York recognizes postnuptial agreements. Couples often sign one after an inheritance, a business purchase, or a move across the border changes the picture. The same requirements apply: real disclosure, separate lawyers, and no coercion. A contract signed during calm periods is far easier to defend later. ---",
          },
        ],
        relatedSlugs: [
          "divorce-and-separation",
          "parenting-time-and-decision-making",
          "child-and-spousal-support",
        ],
        cta: "Start a domestic contract",
        icon: "file-pen",
        seo: {
          title: "Prenup and Cohabitation Agreement Lawyers",
          description:
            "Marriage contracts, prenuptial and cohabitation agreements drafted for Ontario and New York, with the disclosure and legal advice needed to make them stick.",
        },
      },
    ],
  },
  {
    slug: "estate-planning",
    audience: "individual",
    name: "Estate Planning & Estate Administration",
    tagline: "Wills, powers of attorney and estates for families with assets in both countries.",
    overview:
      "Estate planning is not the same exercise in Canada and the United States, and copying a US plan into Ontario can backfire. Canada has no estate or inheritance tax, but it does tax gains as though you sold everything on the day you die, and Ontario charges Estate Administration Tax on the value of a probated estate. The US taxes estates directly, and Americans living in Canada, or Canadians owning US property, sit under both systems. We plan for the whole picture.",
    icon: "scroll-text",
    order: 3,
    seo: {
      title: "Estate Planning Lawyers | Ontario and New York",
      description:
        "Wills, trusts, powers of attorney and estate administration in Ontario and New York, including US estate tax exposure for Canadians who own US property.",
    },
    services: [
      {
        slug: "wills-and-powers-of-attorney",
        name: "Wills and Powers of Attorney",
        summary:
          "The core documents that say who inherits, who decides your care, and who manages your money if you cannot.",
        description:
          "Every adult needs three things: a will, a document naming someone to handle money if you lose capacity, and a document naming someone to make health decisions. Ontario calls the last two a continuing power of attorney for property and a power of attorney for personal care, while New York uses a durable power of attorney and a health care proxy. Signing formalities differ, so we prepare for each jurisdiction.",
        keyFeatures: [
          "Ontario and New York wills drafted to each province's formalities",
          "Continuing power of attorney for property with clear spending limits",
          "Health care proxy and personal care directive naming your substitute",
          "Primary and secondary wills where private company shares are held",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Does my US will work in Canada, or the reverse?",
            answer:
              "Sometimes, but relying on it is risky. A will valid where it was signed is often recognized, yet foreign wording can create tax problems and can slow a probate application badly. Many cross-border families are better served by separate wills, one per country, each limited to the assets in that country and carefully drafted so neither revokes the other. We coordinate both sides.",
          },
          {
            question: "What happens if I die without a will?",
            answer:
              "The government's default rules decide. In Ontario, the Succession Law Reform Act gives the spouse a preferential share and splits the rest with any children. New York splits the estate between spouse and children under its own formula. Neither scheme accounts for stepchildren, a common-law partner in some provinces, or a dependent with a disability, and someone must apply to court to be appointed.",
          },
          {
            question: "What does a will cost?",
            answer:
              "Straightforward wills and powers of attorney are usually quoted as a flat fee for the package, so you know the number before we begin. Plans with trusts, business interests, a blended family, or assets in both countries are quoted separately after a scoping meeting, because the drafting and tax analysis involved varies widely. We give you the fee in writing before any drafting starts.",
          },
        ],
        relatedSlugs: [
          "trusts-and-wealth-transfer",
          "estate-administration-and-probate",
          "guardianship-and-capacity",
        ],
        cta: "Start your will",
        icon: "file-text",
        seo: {
          title: "Wills and Power of Attorney Lawyers | CA and US",
          description:
            "Wills, continuing powers of attorney and health care directives drafted for Ontario and New York, including multiple wills for cross-border and business assets.",
        },
      },
      {
        slug: "trusts-and-wealth-transfer",
        name: "Trusts and Wealth Transfer Planning",
        summary:
          "Trust structures, gifting plans and cross-border tax planning designed to move wealth to the next generation cleanly.",
        description:
          "The American revocable living trust does not travel well. Canada taxes most inter vivos trusts at the top marginal rate and applies a deemed disposition every 21 years, so a US-style trust can create tax where none existed. Canada offers different tools instead, and we match the structure to where you live, where your beneficiaries live, and where the assets sit.",
        keyFeatures: [
          "Alter ego and joint partner trusts for settlors aged 65 or older",
          "Secondary wills sheltering private shares from Ontario probate tax",
          "Henson trusts protecting a beneficiary's disability benefits",
          "US situs asset review for estate tax and treaty relief",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "I have a US living trust. Does it work now that I live in Canada?",
            answer:
              "Often not as intended. Canada does not use probate avoidance trusts the same way, taxes most inter vivos trusts at the highest personal rate, and deems a disposition of trust assets every 21 years. A trust that saved probate in New York can create annual Canadian tax filings and unexpected capital gains. Bring the deed to us and we will review it with a cross-border accountant.",
          },
          {
            question: "I own a condo in Florida. Will my family owe US estate tax?",
            answer:
              "Possibly. The US taxes non-residents on US situs assets, which include US real estate and shares of US companies, with only a small exemption on its own. The Canada-US tax treaty gives Canadian residents access to a much larger credit tied to worldwide estate value. Whether you are exposed depends on your total estate, so the number is worth running before you buy more.",
          },
          {
            question: "Can I just put my house in my child's name instead?",
            answer:
              "Please speak to us first. Adding an adult child to title can trigger immediate capital gains tax, expose the home to your child's divorce or creditors, and forfeit part of the principal residence exemption. Ontario courts also often treat such transfers as held in trust for the estate rather than as gifts. There are usually cleaner ways to reach the same goal.",
          },
        ],
        relatedSlugs: [
          "wills-and-powers-of-attorney",
          "estate-administration-and-probate",
          "guardianship-and-capacity",
        ],
        cta: "Review your wealth transfer plan",
        icon: "landmark",
        seo: {
          title: "Trust and Wealth Transfer Lawyers | Canada, US",
          description:
            "Trust planning that respects both systems: alter ego and joint partner trusts in Canada, revocable trusts in the US, and US estate tax exposure for Canadians.",
        },
      },
      {
        slug: "estate-administration-and-probate",
        name: "Estate Administration and Probate",
        summary:
          "Step-by-step support for executors and estate trustees settling an estate after a death in the family.",
        description:
          "Being named executor arrives at the worst possible time. In Ontario the court document you need is a Certificate of Appointment of Estate Trustee, applied for with the Form 74 series at the Superior Court of Justice, while New York issues letters testamentary through the Surrogate's Court. We prepare the filings, calculate the tax, and keep you onside with your duties.",
        keyFeatures: [
          "Certificate of Appointment or letters testamentary applications filed",
          "Estate Administration Tax and Estate Information Return calculated",
          "Asset inventory, valuations and date-of-death account balances gathered",
          "Creditor claims cleared and final estate accounts prepared",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long does probate take?",
            answer:
              "In Ontario, the court usually issues a Certificate of Appointment of Estate Trustee in about four to eight weeks once a complete application is filed, though settling the whole estate commonly takes six to twelve months. New York Surrogate's Court timelines vary by county and often run longer when a will is contested. Real estate, foreign assets and unclear beneficiaries add months in either place.",
          },
          {
            question: "Do we have to go through probate at all?",
            answer:
              "Not always. Ontario has a Small Estate Certificate for estates valued at up to $150,000, and assets held jointly with right of survivorship or with a named beneficiary may pass outside the estate. Banks and land registries still often insist on a certificate before transferring anything substantial. We check the asset list first and tell you which route each item takes.",
          },
          {
            question: "Can I be held personally responsible as executor?",
            answer:
              "Yes, which is exactly why executors get advice. If you distribute the estate before clearing taxes and creditors, you can be pursued personally for the shortfall. The protections are procedural: advertise for creditors, obtain a clearance from the tax authority before final distribution, keep proper estate accounts, and document your decisions. We set that sequence up so you are not exposed.",
          },
        ],
        relatedSlugs: [
          "wills-and-powers-of-attorney",
          "trusts-and-wealth-transfer",
          "guardianship-and-capacity",
        ],
        cta: "Get executor support",
        icon: "file-check",
        seo: {
          title: "Probate and Estate Administration Lawyers",
          description:
            "Help for executors in Ontario and New York with the Certificate of Appointment of Estate Trustee, probate filings, creditor claims and final distributions.",
        },
      },
      {
        slug: "guardianship-and-capacity",
        name: "Guardianship and Capacity Applications",
        summary:
          "Court authority to manage money and care decisions for a child or an adult who can no longer decide alone.",
        description:
          "When someone loses the ability to manage their own affairs and never signed a power of attorney, a court appointment is the remaining route. Ontario's Substitute Decisions Act splits it in two: guardianship of property and guardianship of the person, and most US states use the words guardianship and conservatorship for the same division. Both need medical evidence and ongoing accounting.",
        keyFeatures: [
          "Capacity assessments arranged with qualified Ontario assessors",
          "Guardianship of property and of the person applications prepared",
          "Management plans and guardianship plans drafted for the court",
          "Contested applications and Consent and Capacity Board hearings",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "My parent has dementia. Can I just handle their banking?",
            answer:
              "Only with legal authority. If your parent signed a continuing power of attorney for property while still capable, that document is your authority and no court application is needed. Without one, the bank will refuse, and you must apply for guardianship of property, which takes months and requires a capacity assessment. If your parent still has capacity today, signing a power of attorney now avoids all of it.",
          },
          {
            question: "Who decides whether someone is incapable?",
            answer:
              "Not the family. In Ontario a designated capacity assessor, usually a physician, psychologist, social worker or occupational therapist with specific training, conducts a formal assessment tied to a particular decision. A certificate of incapacity to manage property can make the Public Guardian and Trustee the statutory guardian. US courts rely on physician affidavits and often appoint a guardian ad litem to report independently.",
          },
          {
            question: "What if family members disagree about who should be guardian?",
            answer:
              "Contested guardianships happen often, and the court decides on what serves the incapable person, not on seniority among siblings. Judges look at who has been providing care, who lives nearby, whether there is any conflict over money, and whether a neutral trust company would be safer. Mediation resolves many of these before hearing, and it is usually faster and far less damaging. ---",
          },
        ],
        relatedSlugs: [
          "wills-and-powers-of-attorney",
          "trusts-and-wealth-transfer",
          "estate-administration-and-probate",
        ],
        cta: "Discuss a guardianship application",
        icon: "user-check",
        seo: {
          title: "Guardianship and Capacity Lawyers | CA and US",
          description:
            "Guardianship of property and of the person under Ontario's Substitute Decisions Act, plus US guardianship and conservatorship applications and disputes.",
        },
      },
    ],
  },
  {
    slug: "criminal-defence",
    audience: "individual",
    name: "Criminal Defence & Records",
    tagline: "Charged in Ontario or New York? Get advice before you say anything to police.",
    overview:
      "A criminal charge threatens your job, your travel and your peace of mind long before any trial. Canadian charges come under one national Criminal Code, so the offence is the same in Toronto as in Vancouver, while US charges depend on the state or on federal law. One point matters more for our clients than any other: a conviction on either side can make you inadmissible to the other country, sometimes for years. We factor the border into the defence from day one.",
    icon: "gavel",
    order: 4,
    seo: {
      title: "Criminal Defence Lawyers | Ontario and New York",
      description:
        "Impaired driving, fraud and other charges in Ontario and New York, plus record suspensions and expungement. We also flag the border effect of any conviction.",
    },
    services: [
      {
        slug: "impaired-driving-defence",
        name: "Impaired Driving Defence",
        summary:
          "Defence for impaired operation and over 80 charges in Canada, and DUI or DWI charges in the United States.",
        description:
          "Canada prosecutes these charges under section 320.14 of the Criminal Code, as impaired operation or as over 80, meaning a blood alcohol concentration at or above 0.08. The US labels the same conduct DUI or DWI under state law. Both systems run a licence suspension through the motor vehicle authority separately from the criminal case, and those deadlines move fast.",
        keyFeatures: [
          "Breath, blood and drug screening procedures challenged on the record",
          "Administrative licence suspension hearings handled within tight deadlines",
          "Charter and constitutional arguments on stops, detention and counsel",
          "Ignition interlock and reduced suspension streams applied for",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "What happens to my licence right away?",
            answer:
              "The roadside suspension is administrative and separate from the criminal charge. Ontario imposes an immediate 90-day licence suspension and a seven-day vehicle impoundment on an over 80 or refusal reading. New York suspends at arraignment. You can sometimes request a review or a hardship privilege, but only within days. Call us before that window closes, not after your first court date.",
          },
          {
            question: "Can I still cross the border with an impaired driving conviction?",
            answer:
              "This is the question people ask too late. A US DUI conviction can make you inadmissible to Canada, and a Canadian impaired driving conviction can make you inadmissible to the US. Importantly, a US expungement does not automatically cure Canadian inadmissibility. Relief exists through criminal rehabilitation, a temporary resident permit, or a US waiver, but each takes months to obtain.",
          },
          {
            question: "Is a first offence really that serious in Canada?",
            answer:
              "Yes. A first conviction carries a mandatory minimum fine of $1,000, a minimum one-year driving prohibition, and a permanent criminal record. There is no discharge available for these offences. Insurance premiums rise sharply, and many employers and licensing bodies ask. Because the minimums are fixed by statute, the meaningful work happens in challenging the charge itself, not in pleading for leniency.",
          },
        ],
        relatedSlugs: [
          "fraud-and-white-collar-defence",
          "criminal-charges-and-trials",
          "bail-and-record-clearing",
        ],
        cta: "Get urgent charge advice",
        icon: "siren",
        seo: {
          title: "Impaired Driving and DUI Defence Lawyers",
          description:
            "Over 80 and impaired operation charges under the Criminal Code, and DUI or DWI charges in New York. Licence suspensions, testing challenges and border advice.",
        },
      },
      {
        slug: "fraud-and-white-collar-defence",
        name: "Fraud and White-Collar Defence",
        summary:
          "Defence for individuals and professionals accused of fraud, breach of trust, embezzlement or financial cybercrime.",
        description:
          "Financial cases usually begin quietly, with an internal audit, a regulator's letter, or a request for documents. What you say and hand over in those first weeks often decides the case. We step in early, deal with investigators on your behalf, and keep your privileged material protected while the file develops.",
        keyFeatures: [
          "Early engagement with investigators, regulators and internal auditors",
          "Forensic accounting review of transaction records and ledgers",
          "Production order, subpoena and grand jury response managed",
          "Professional licence and regulatory exposure addressed in parallel",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "The police want to ask me a few questions. Should I go?",
            answer:
              "Speak to a lawyer first, every time. In Canada you have the right to remain silent and to consult counsel without delay; in the US the Fifth and Sixth Amendments protect silence and defense counsel. Investigators are permitted to interview people who are not yet charged, and helpful-sounding conversations become evidence. Declining to answer until you have advice is not an admission of anything.",
          },
          {
            question: "My employer says it is an internal matter. Do I still need a lawyer?",
            answer:
              "Yes. An internal investigation is run for the company, not for you, and its lawyers do not represent you even when they are friendly. Findings are frequently handed to police or a regulator afterwards, and your statements go with them. Getting independent advice before you sit down for an internal interview protects you without suggesting you did anything wrong.",
          },
          {
            question: "How are these cases charged in Canada versus the US?",
            answer:
              "Canada prosecutes fraud, theft and breach of trust under the Criminal Code, with fraud over $5,000 carrying a maximum of 14 years. The US often charges the same conduct as federal wire or mail fraud, and its sentencing guidelines weigh loss amounts heavily, which can produce longer sentences. Conduct that crossed the border can attract charges in both countries.",
          },
        ],
        relatedSlugs: [
          "impaired-driving-defence",
          "criminal-charges-and-trials",
          "bail-and-record-clearing",
        ],
        cta: "Speak to us confidentially",
        icon: "briefcase",
        seo: {
          title: "Fraud and White-Collar Defence Lawyers",
          description:
            "Defence for fraud, breach of trust, embezzlement and cybercrime allegations in Canada and the United States, including cross-border regulatory investigations.",
        },
      },
      {
        slug: "criminal-charges-and-trials",
        name: "Criminal Charges and Trials",
        summary:
          "Defence from first appearance through trial for charges ranging from minor offences to the most serious ones.",
        description:
          "We read the disclosure before we give you an opinion, because a charge and a provable case are different things. Canadian offences are either summary or indictable, and for many you choose the court and whether a jury hears it, while New York divides charges into violations, misdemeanors and felonies. In both systems, the strongest work often happens in pre-trial motions.",
        keyFeatures: [
          "Full Crown disclosure or prosecution discovery obtained and analysed",
          "Motions to exclude evidence from unlawful searches and statements",
          "Delay applications under the Jordan framework in Canadian courts",
          "Resolution discussions, diversion and sentencing submissions prepared",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "What actually happens at my first court date?",
            answer:
              "Far less than people fear. A first appearance in Ontario is usually administrative: disclosure is requested, and the matter is adjourned. No evidence is heard and you do not plead. Your lawyer can often attend for you on simple matters. New York arraignment is more substantive, since the judge addresses release conditions there. Either way, nothing is decided that day.",
          },
          {
            question: "Will this stay on my record forever?",
            answer:
              "Not necessarily. Charges that are withdrawn, stayed or dismissed do not produce a conviction, though the fingerprint and police records may linger until you ask for their destruction. In Canada an absolute or conditional discharge is not a conviction and is purged automatically after one or three years. A true conviction remains until a record suspension is granted.",
          },
          {
            question: "How much will a defence cost?",
            answer:
              "Criminal files are usually quoted as a block fee for a defined stage, such as disclosure review and resolution talks, with a further fee if the matter proceeds to trial. Some firms work on a retainer billed hourly instead. We give you the structure and the stages in writing at the start, and we tell you when legal aid may be a realistic option.",
          },
        ],
        relatedSlugs: [
          "impaired-driving-defence",
          "fraud-and-white-collar-defence",
          "bail-and-record-clearing",
        ],
        cta: "Arrange a charge assessment",
        icon: "scale",
        seo: {
          title: "Criminal Trial Lawyers | Ontario and New York",
          description:
            "Defence from first appearance to trial for summary, indictable, misdemeanor and felony charges in Ontario and New York, with disclosure and Charter motions.",
        },
      },
      {
        slug: "bail-and-record-clearing",
        name: "Bail, Record Suspensions and Expungement",
        summary:
          "Getting you released after an arrest, and later clearing an old record that blocks jobs, housing or travel.",
        description:
          "Two very different moments, both about freedom: right after an arrest the job is release on workable conditions, and years later the job is clearing what is left behind. Canada no longer grants pardons in the old sense, since the Parole Board of Canada now issues a record suspension, which seals the record rather than erasing it. US states use expungement or sealing instead.",
        keyFeatures: [
          "Bail hearings prepared with sureties, plans and release conditions",
          "Bail variation applications when conditions become unworkable",
          "Record suspension applications assembled for the Parole Board of Canada",
          "State expungement, sealing and set-aside petitions filed",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How soon is a bail hearing after an arrest?",
            answer:
              "In Canada, a person held in custody must be brought before a justice within 24 hours where one is available. Most people are released by police before that. If a hearing is needed, having a proposed surety at court with a written plan makes a real difference. New York arraignment is also prompt, and its bail reform rules make many offences non-qualifying for cash bail.",
          },
          {
            question: "When can I apply for a record suspension in Canada?",
            answer:
              "You must finish everything first: jail, probation, and payment of all fines and restitution. From that completion date, the wait is five years for a summary conviction offence and ten years for an indictable offence. The Parole Board of Canada then assesses good conduct. Some offences, including many involving children, are not eligible at all.",
          },
          {
            question: "Does clearing my record fix border problems?",
            answer:
              "Not on its own, and this trips people up constantly. A US expungement generally does not make you admissible to Canada, because Canadian officers look at the underlying conduct. A Canadian record suspension helps with Canadian background checks but does not bind US officers, who may already have the record. Cross-border relief runs through waivers and rehabilitation applications instead. ---",
          },
        ],
        relatedSlugs: [
          "impaired-driving-defence",
          "fraud-and-white-collar-defence",
          "criminal-charges-and-trials",
        ],
        cta: "Request urgent bail help",
        icon: "key-round",
        seo: {
          title: "Bail Hearings and Record Suspension Lawyers",
          description:
            "Urgent bail hearings, plus record suspensions through the Parole Board of Canada and US expungement or sealing, so an old record stops blocking work and travel.",
        },
      },
    ],
  },
  {
    slug: "residential-real-estate",
    audience: "individual",
    name: "Residential Real Estate",
    tagline: "Buying, selling or renting a home in Ontario or New York, with your interests only.",
    overview:
      "A home purchase is the largest contract most people ever sign, and the process is not the same in both countries. Ontario requires a lawyer to complete a residential transfer, registered electronically through the Teraview system on the provincial Land Titles register. New York transactions typically involve a title company and an escrow closing, with an attorney at the table in New York State. We act for you alone in either setting.",
    icon: "house",
    order: 5,
    seo: {
      title: "Residential Real Estate Lawyers | Toronto, NY",
      description:
        "Home closings, title searches, boundary disputes and landlord-tenant matters in Ontario and New York, handled by lawyers acting for you and nobody else.",
    },
    services: [
      {
        slug: "home-purchases-and-sales",
        name: "Home Purchases and Sales",
        summary:
          "Contract review and closing work for buyers and sellers of houses, condominiums and co-operative units.",
        description:
          "We review the agreement before you are bound, not after. On an Ontario purchase we search title, order the condominium status certificate where relevant, calculate land transfer tax and closing adjustments, and register the transfer electronically through Teraview on closing day. On a New York purchase we work through contract, mortgage contingency, title clearance and the closing disclosure.",
        keyFeatures: [
          "Agreement of purchase and sale reviewed before conditions expire",
          "Land transfer tax, Toronto tax and buyer rebates calculated",
          "Condominium status certificate and co-op board package reviewed",
          "Electronic registration through Teraview on the Land Titles register",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "Do I really need a lawyer to buy a home?",
            answer:
              "In Ontario, yes. Only a lawyer can complete the electronic registration that transfers title, so every residential closing involves one. In New York State a real estate attorney is standard practice for both sides, while some other states close through a title company alone. Either way, the agent works on the transaction; the lawyer works on protecting your side of it.",
          },
          {
            question: "What will closing costs come to?",
            answer:
              "Budget beyond the purchase price. In Ontario that means land transfer tax, a second municipal tax in Toronto, title insurance, registration fees, the legal fee and adjustments for prepaid property tax and utilities. First-time buyers can claim rebates against the land transfer tax. New York adds mortgage recording tax and, above certain price points, a mansion tax. We give you a written estimate early.",
          },
          {
            question: "I am not a citizen or resident. Can I still buy?",
            answer:
              "You can, with extra planning. Ontario applies a Non-Resident Speculation Tax of 25 percent to residential purchases by foreign buyers province-wide, and federal restrictions have applied to some non-resident purchases. Buying in the US as a Canadian raises withholding tax on a later sale and possible US estate tax exposure. Get tax advice before you make an offer, not after.",
          },
        ],
        relatedSlugs: [
          "title-searches-and-title-insurance",
          "property-line-and-easement-disputes",
          "landlord-and-tenant-matters",
        ],
        cta: "Get a closing quote",
        icon: "key",
        seo: {
          title: "Home Closing Lawyers | Ontario and New York",
          description:
            "Residential purchase and sale closings in Ontario and New York, including agreement review, land transfer tax, adjustments and electronic registration of title.",
        },
      },
      {
        slug: "title-searches-and-title-insurance",
        name: "Title Searches and Title Insurance",
        summary:
          "Checking the history of a property so no hidden lien, claim or encumbrance follows you after closing day.",
        description:
          "A title search asks a simple question: does the seller actually own what they are selling, and what is attached to it? We look for unpaid mortgages, tax arrears, construction liens, work orders and registered easements. Ontario's Land Titles system is state-backed and generally reliable, but title insurance still covers fraud, survey problems and unknown work orders.",
        keyFeatures: [
          "Full title history searched on Land Titles or county records",
          "Discharge of old mortgages, liens and tax arrears arranged",
          "Municipal work orders, zoning and open permits checked",
          "Owner and lender title insurance policies placed and explained",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "If Ontario guarantees title, why buy title insurance?",
            answer:
              "Because the protection has gaps. Ontario's Land Titles register is backed by a provincial assurance fund and is very dependable for ownership itself, but it does not protect you from title fraud, an unregistered work order, a fence built over the line, or a previous owner's unpermitted renovation. A one-time owner policy premium covers those and stays in force as long as you own the home.",
          },
          {
            question: "What is the difference between owner and lender coverage?",
            answer:
              "A lender policy protects the bank's security up to the mortgage balance, and it is usually required as a condition of financing. It pays the lender, not you. An owner policy protects your own equity and your legal costs if someone challenges your title. They are often issued together at closing, and adding the owner policy costs far less than buying it alone.",
          },
          {
            question: "Something turned up on title. Does the deal collapse?",
            answer:
              "Usually not. Most defects are routine and fixable: an old mortgage that was paid but never discharged, a small lien, or an outdated easement. We requisition the seller to clear it before closing, hold funds back in trust, or arrange insurance over the specific defect. Only a genuine ownership problem puts a transaction at real risk, and those are uncommon.",
          },
        ],
        relatedSlugs: [
          "home-purchases-and-sales",
          "property-line-and-easement-disputes",
          "landlord-and-tenant-matters",
        ],
        cta: "Order a title review",
        icon: "file-search",
        seo: {
          title: "Title Search and Title Insurance Lawyers",
          description:
            "Title searches, lien and encumbrance clearing, and owner or lender title insurance for homes in Ontario and New York, so nothing follows you after closing.",
        },
      },
      {
        slug: "property-line-and-easement-disputes",
        name: "Property Line, Easement and Neighbour Disputes",
        summary:
          "Resolving fence, driveway, survey and right-of-way disagreements with a neighbour before they become costly litigation.",
        description:
          "These disputes are rarely about the strip of land; they are about a driveway someone cannot use or a fence built two feet over. We start with an Ontario Land Surveyor or a licensed US surveyor, because a real survey settles more arguments than any letter. Where that does not end it, the law differs meaningfully between the two countries.",
        keyFeatures: [
          "Current survey or reference plan commissioned from a licensed surveyor",
          "Registered easements, rights-of-way and shared driveways interpreted",
          "Line Fences Act fence-viewer process used for cost-sharing disputes",
          "Boundary applications and quiet title actions brought when needed",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "My neighbour's fence is on my land. What can I do?",
            answer:
              "Start with a survey. Many fences follow a hedge or an old post rather than the true line, and neither neighbour knows which. If the fence is over the line, most disputes settle once the survey is on the table. Ontario's Line Fences Act also provides fence-viewers, municipal appointees who can rule on the cost of a boundary fence and split it.",
          },
          {
            question: "They have used my driveway for 20 years. Do they own that right now?",
            answer:
              "Probably not in Ontario. On land registered under Land Titles, which covers almost all Ontario property, you generally cannot acquire rights by adverse possession or create a prescriptive easement through long use. New York is different, where continuous and hostile use for 10 years can support an adverse possession or prescriptive easement claim. The jurisdiction changes the answer completely.",
          },
          {
            question: "Can I avoid going to court over this?",
            answer:
              "Usually, and it is worth trying. Litigation over a narrow strip regularly costs more than the land is worth, and in Ontario the losing party can be ordered to pay part of the winner's legal costs. A survey, a written boundary agreement registered on title, or a mediated settlement resolves most of these. We keep court as the last option rather than the first.",
          },
        ],
        relatedSlugs: [
          "home-purchases-and-sales",
          "title-searches-and-title-insurance",
          "landlord-and-tenant-matters",
        ],
        cta: "Resolve a boundary dispute",
        icon: "fence",
        seo: {
          title: "Property Line and Easement Dispute Lawyers",
          description:
            "Boundary, fence, driveway and easement disputes with neighbours in Ontario and New York, including surveys, right-of-way access and adverse possession claims.",
        },
      },
      {
        slug: "landlord-and-tenant-matters",
        name: "Landlord and Tenant Matters",
        summary:
          "Lease drafting, eviction applications, repair complaints and deposit disputes for landlords and tenants in Ontario and New York.",
        description:
          "Ontario residential tenancies run under the Residential Tenancies Act and are decided by the Landlord and Tenant Board, not the courts. New York City matters go to Housing Court under rules reshaped by recent tenant protection legislation. We act for landlords and for tenants, though never for both sides of the same tenancy, and we say at the outset what a realistic timeline looks like.",
        keyFeatures: [
          "Leases drafted on the required Ontario standard lease form",
          "Eviction notices and Board applications prepared and served correctly",
          "Repair, heat and habitability complaints documented and advanced",
          "Deposit, rent arrears and bad-faith eviction compensation claims",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long does an eviction take in Ontario?",
            answer:
              "Longer than most landlords expect. After the notice period expires you file with the Landlord and Tenant Board, and hearing waits commonly run six to twelve months, with the longest delays in Toronto. Enforcement afterwards goes through the Sheriff, adding weeks. Skipping the process and changing the locks is illegal and exposes you to a substantial fine, so the formal route is the only route.",
          },
          {
            question: "Can my landlord evict me to move a family member in?",
            answer:
              "Only under strict conditions. An Ontario landlord may serve an N12 notice for personal use by the owner or a close family member, must compensate you with one month's rent or another unit, and as of September 2026 the named person must actually move in within 60 days. Missing that window raises a presumption of bad faith and can support a compensation claim.",
          },
          {
            question: "Can a landlord in Ontario take a damage deposit?",
            answer:
              "No. Ontario landlords may collect a rent deposit, applied to the last rental period, plus a key deposit limited to the replacement cost. Damage deposits, pet deposits and last-plus-security arrangements are not permitted, and the rent deposit earns interest each year at the rent increase guideline. New York allows a security deposit, capped at one month's rent, returnable within 14 days. ---",
          },
        ],
        relatedSlugs: [
          "home-purchases-and-sales",
          "title-searches-and-title-insurance",
          "property-line-and-easement-disputes",
        ],
        cta: "Get rental advice",
        icon: "building",
        seo: {
          title: "Landlord and Tenant Lawyers | Ontario and NY",
          description:
            "Leases, evictions, repairs and deposit disputes for landlords and tenants at Ontario's Landlord and Tenant Board and in New York Housing Court proceedings.",
        },
      },
    ],
  },
  {
    slug: "immigration-citizenship",
    audience: "individual",
    name: "Immigration & Citizenship",
    tagline:
      "Moving, working or studying across the Canada/US border, and staying onside with both.",
    overview:
      "Immigration is the practice area where a cross-border firm earns its keep. Canadian applications go to Immigration, Refugees and Citizenship Canada, usually called IRCC, while US applications go to USCIS, the consulates, or immigration court. The two systems use different vocabulary for similar ideas: permanent residence in Canada is roughly the green card in the US. We help families decide which country to apply in, and in what order.",
    icon: "plane",
    order: 6,
    seo: {
      title: "Immigration Lawyers | Canada and US Cross-Border",
      description:
        "Family sponsorship, work and study permits, permanent residence, green cards and removal defence, handled for both IRCC in Canada and USCIS in the US.",
    },
    services: [
      {
        slug: "family-sponsorship",
        name: "Family Sponsorship and Spousal Immigration",
        summary:
          "Bringing a spouse, partner, child or parent to Canada or the United States through family-based immigration.",
        description:
          "Both countries let a citizen or permanent resident sponsor close family, and both scrutinize the relationship closely. Canada uses IRCC sponsorship, with inland and outland streams, while the US uses Form I-130 for a spouse, or the K-1 fiance visa for a partner you have not yet married. Evidence of a genuine relationship is what these applications turn on.",
        keyFeatures: [
          "Inland versus outland sponsorship stream chosen and explained",
          "Relationship evidence packages built to IRCC and USCIS standards",
          "Sponsor eligibility, income and undertaking obligations reviewed",
          "Open work permit and adjustment of status applications filed",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long does spousal sponsorship take?",
            answer:
              "As of 2026, IRCC posts roughly 16 months for outland spousal sponsorship and around 25 months for inland applications outside Quebec. On the US side, an I-130 for the spouse of a US citizen takes roughly a year before consular processing begins, and much longer where the sponsor is a green card holder. Both figures shift, so we check current posted times when you apply.",
          },
          {
            question: "Can my spouse work while we wait?",
            answer:
              "Often yes, but it depends on the stream. A spouse applying through Canada's inland stream can usually apply for an open work permit and work while the application is processed. A US spouse applying through adjustment of status can request employment authorization, though the wait for the document can be several months. Outland and consular applicants generally cannot work in the destination country meanwhile.",
          },
          {
            question: "What if we are not married yet?",
            answer:
              "You have choices. Canada recognizes common-law partners who have lived together for 12 continuous months, and conjugal partners where living together was genuinely impossible, both of which can be sponsored. The US has no common-law sponsorship category; instead the K-1 fiance visa lets a partner enter to marry within 90 days. Which route is faster depends on your circumstances and where you both live.",
          },
        ],
        relatedSlugs: [
          "work-and-study-permits",
          "permanent-residence-and-green-cards",
          "citizenship-appeals-and-removal-defence",
        ],
        cta: "Check your sponsorship options",
        icon: "heart-handshake",
        seo: {
          title: "Spousal Sponsorship and Marriage Visa Lawyers",
          description:
            "IRCC spousal and family sponsorship in Canada, plus USCIS I-130 petitions and K-1 fiance visas, prepared to withstand relationship and eligibility scrutiny.",
        },
      },
      {
        slug: "work-and-study-permits",
        name: "Work Permits, Study Permits and Employment Visas",
        summary:
          "Permits and visas that let you work, train or study on the other side of the border, lawfully and on time.",
        description:
          "The Canada/US border has fast lanes most people do not know about. CUSMA, the trade agreement formerly called NAFTA, lets qualifying professionals work across the border without a labour market test: in Canada that means an LMIA-exempt work permit, and in the US it means TN status. Where CUSMA does not fit, we look at LMIA-based permits and intra-company transfers.",
        keyFeatures: [
          "CUSMA professional and TN eligibility assessed against the listed occupations",
          "LMIA applications and LMIA-exempt streams prepared for employers",
          "Intra-company transfer permits and L-1 petitions coordinated",
          "Study permits with post-graduation work permit planning built in",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "What is the fastest way to work on the other side of the border?",
            answer:
              "For professionals, usually CUSMA. A US or Mexican citizen in a listed profession can often obtain a Canadian work permit at the port of entry, and a Canadian professional can seek TN status at a US port of entry, with no labour market test and no lottery. The catch is that your job must genuinely match a listed occupation and your credentials must line up exactly.",
          },
          {
            question: "Do I need a job offer first?",
            answer:
              "For most work permits, yes. CUSMA, TN, L-1 and LMIA-based permits are all tied to a specific employer and role. Canada does have open work permits for some spouses and post-graduation students that are not tied to an employer. If you have no offer yet, permanent residence pathways such as Express Entry may be the better place to start.",
          },
          {
            question: "Can my family come with me?",
            answer:
              "Usually. A Canadian work permit holder in a skilled role can often have a spouse apply for an open work permit and children study without separate permits. In the US, H-1B, L-1 and TN holders bring dependants on companion status, though work rights for those dependants vary significantly by category. Plan the family applications together with yours, not afterwards.",
          },
        ],
        relatedSlugs: [
          "family-sponsorship",
          "permanent-residence-and-green-cards",
          "citizenship-appeals-and-removal-defence",
        ],
        cta: "Find your permit pathway",
        icon: "graduation-cap",
        seo: {
          title: "Work Permit and Study Permit Lawyers | CA, US",
          description:
            "LMIA and CUSMA work permits, study permits, and H-1B, TN and L-1 visas for professionals and students moving between Canada and the United States for work.",
        },
      },
      {
        slug: "permanent-residence-and-green-cards",
        name: "Permanent Residence and Green Cards",
        summary:
          "Building the profile and filing the applications that turn temporary status into permanent residence or a green card.",
        description:
          "Canada selects most economic immigrants through Express Entry, a points-ranked pool drawn from regularly, and draws are increasingly category-based, favouring French speakers, health care, trades and in-Canada experience. Provincial Nominee Programs offer a second route. The US path is usually family or employer sponsorship, then adjustment of status or consular processing.",
        keyFeatures: [
          "Comprehensive Ranking System score calculated and improvement options mapped",
          "Educational credential assessments and language test timing planned",
          "Provincial Nominee Program streams matched to your work history",
          "Adjustment of status or consular processing packages prepared",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "What score do I need for Express Entry?",
            answer:
              "There is no fixed pass mark. IRCC invites the highest-ranked profiles in each draw, so the cut-off moves with the pool and the draw type. Category-based draws for French speakers, health care, trades and in-Canada experience have often had lower cut-offs than general draws. We calculate your score, then look at which lever, language retest, credential, or a provincial nomination, moves it most.",
          },
          {
            question: "Can I apply to both countries at once?",
            answer:
              "You can, and many cross-border families do. Neither country forbids a pending application elsewhere. Be careful with intent, though: applying for US permanent residence while holding a US temporary visa that requires non-immigrant intent can create problems at the border. Sequence matters, and we map the order and the timing before either application goes in.",
          },
          {
            question: "How long does permanent residence take?",
            answer:
              "Canadian Express Entry applications are commonly processed within about six months once an invitation is accepted, though building a competitive profile beforehand can take much longer. US employment-based green cards depend on the category and your country of birth, and applicants from heavily subscribed countries can wait many years. We give you a realistic range for your specific route.",
          },
        ],
        relatedSlugs: [
          "family-sponsorship",
          "work-and-study-permits",
          "citizenship-appeals-and-removal-defence",
        ],
        cta: "Assess your PR eligibility",
        icon: "id-card",
        seo: {
          title: "Permanent Residence and Green Card Lawyers",
          description:
            "Express Entry, Provincial Nominee Programs and Canadian permanent residence, plus US family and employment-based green cards and adjustment of status filings.",
        },
      },
      {
        slug: "citizenship-appeals-and-removal-defence",
        name: "Citizenship, Appeals and Removal Defence",
        summary:
          "Citizenship applications, appeals of refusals, and defence when you are facing removal from either country.",
        description:
          "Two very different needs sit here: some clients are finishing the journey and applying for citizenship, while others have been refused, reported, or served with a removal order and need help urgently. Canadian appeals may go to the Immigration Appeal Division or to the Federal Court, and US cases go before an immigration judge. Deadlines are short and unforgiving.",
        keyFeatures: [
          "Physical presence calculations verified before a citizenship filing",
          "Immigration Appeal Division appeals on removal and residency obligations",
          "Federal Court judicial review applications filed within the deadline",
          "Humanitarian and compassionate and cancellation of removal applications",
        ],
        jurisdictions: ["US", "CA"],
        faqs: [
          {
            question: "How long must I live in Canada before applying for citizenship?",
            answer:
              "You need 1,095 days of physical presence in Canada during the five years immediately before you apply. The days do not have to be continuous. Time spent in Canada before you became a permanent resident, as a student, worker or protected person, counts as half days up to a maximum of 365. Applicants aged 18 to 54 also take a language and knowledge test.",
          },
          {
            question: "My application was refused. Is that the end?",
            answer:
              "Rarely. Depending on the decision, you may appeal to the Immigration Appeal Division, apply to the Federal Court for judicial review, usually within 15 or 30 days for Canadian decisions, or reapply with the gaps corrected. In the US, an immigration judge's decision can be appealed to the Board of Immigration Appeals within 30 days. Act immediately, because these windows are strict.",
          },
          {
            question: "I have been told I must leave the country. What can I do?",
            answer:
              "Get advice the same day. In Canada, the options may include an appeal to the Immigration Appeal Division, a stay from the Federal Court, a pre-removal risk assessment, or a humanitarian and compassionate application. In the US, relief may include cancellation of removal, asylum, or adjustment through a family member. Missing a hearing usually results in an order being made in your absence.",
          },
        ],
        relatedSlugs: [
          "family-sponsorship",
          "work-and-study-permits",
          "permanent-residence-and-green-cards",
        ],
        cta: "Get help with a refusal or removal",
        icon: "flag",
        seo: {
          title: "Citizenship, Appeals and Removal Defence Lawyers",
          description:
            "Canadian citizenship applications, IRCC refusals, Immigration Appeal Division appeals, and removal or deportation defence in both Canada and the United States.",
        },
      },
    ],
  },
]);
