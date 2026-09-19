/**
 * SEED DATA, NOT LIVE CONTENT.
 *
 * The roster lives in the database so the firm can edit it at
 * /dashboard/settings without a redeploy. This file is copied in once - the
 * first time a repo has no TeamMember rows - and is inert afterwards. Editing
 * it will appear to do nothing on a site that has already run; change the
 * roster from the dashboard instead.
 *
 * ## These people are invented
 *
 * Every name, title and biography below is fictional, like the firm itself.
 * There are no photographs, and `photo` is omitted on all six for the same
 * reason `siteConfig.business.heroImages` is empty: a stock portrait of a real
 * stranger, captioned with an invented lawyer's name and bar admissions, is a
 * claim about that person. A text-only card is the honest version.
 *
 * ## Why the detail is packed into `role` and `bio`
 *
 * `teamMemberSchema` carries slug, name, role, bio and photo - the shape a
 * dental practice or a salon needs. A law firm would ideally have structured
 * bar admissions and practice-area links, but those are columns on a DB-backed
 * table with an owner-facing editor, so adding them means a migration plus new
 * fields in that editor. For a demo the trade is not worth it: `role` carries
 * the title and the admissions, `bio` carries the rest, and both render fine.
 * Noted in specification.md 11 as the one place the attorney model is thinner
 * than a real firm's would want.
 */
import { teamMembersSchema } from "../schema/content.schema";

export const team = teamMembersSchema.parse([
  {
    slug: "aisha-rahman",
    name: "Aisha Rahman",
    role: "Managing Partner — Corporate & Commercial · Ontario and New York",
    bio: "Aisha advises founders and general counsel on where to incorporate and how to structure a business that operates on both sides of the border. She leads the firm's cross-border M&A work and spends most of her time on the question clients ask too late: which entity, in which country, and what that choice costs at exit.",
  },
  {
    slug: "daniel-oyelaran",
    name: "Daniel Oyelaran",
    role: "Partner — Commercial Litigation & Dispute Resolution · Ontario",
    bio: "Daniel acts for companies in contract, shareholder and oppression-remedy disputes, and in arbitrations seated in both countries. He is the person clients call when a deal Aisha papered has gone wrong, and he is candid about the fact that Ontario's loser-pays costs regime changes the arithmetic of whether to fight at all.",
  },
  {
    slug: "marie-claude-tremblay",
    name: "Marie-Claude Tremblay",
    role: "Partner — Data Privacy, Cybersecurity & Technology · Quebec and Ontario",
    bio: "Marie-Claude builds privacy compliance programs for businesses caught between Quebec's Law 25, PIPEDA, and whichever US state statutes apply to their customers. She handles breach response on a clock, and she is the reason the firm treats a privacy impact assessment as the first step in a cross-border data transfer rather than the last.",
  },
  {
    slug: "james-whitcombe",
    name: "James Whitcombe",
    role: "Partner — Criminal Defence & Records · Ontario",
    bio: "James defends impaired driving, fraud and white-collar charges, and applies for record suspensions. He asks every client about their travel and immigration position in the first meeting, because a plea that looks routine in a Toronto courtroom can close the United States to someone for years — and a US expungement does not cure it.",
  },
  {
    slug: "priya-venkatesan",
    name: "Priya Venkatesan",
    role: "Partner — Immigration & Citizenship · Ontario and New York",
    bio: "Priya handles family sponsorship, work and study permits, permanent residence and removal defence on both sides of the border. Much of her practice is untangling the consequences of a decision made elsewhere in the firm — or elsewhere entirely — and she works closely with James on inadmissibility.",
  },
  {
    slug: "helen-osei",
    name: "Helen Osei",
    role: "Partner — Estates, Family & Residential Property · Ontario",
    bio: "Helen advises on wills, powers of attorney, estate administration and the property side of a separation. She sees more cross-border estate problems than anyone expects: a US revocable living trust that creates Canadian tax rather than shelters it, or a Canadian holding US-situs assets with no plan for US estate tax.",
  },
]);
