import { services } from "@/config/content/services";
import { siteConfig } from "@/config/site.config";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Just enough of a team member to introduce them. */
type PromptTeamMember = {
  name: string;
  role: string;
};

// No document upload, no retrieval, no vector search. The "knowledge base" is
// the same structured business/services/team data the rest of the site
// renders.
//
// The roster is a parameter rather than an import because it moved into the
// database when the practice gained an editor for it at /dashboard/settings.
// Passing it in keeps this function pure and unit-testable; importing Prisma
// here instead would drag a database into what is otherwise string formatting,
// and the alternative — leaving the config import in place — meant the bot
// would cheerfully describe staff who left months ago.
export function buildSystemPrompt(team: PromptTeamMember[]): string {
  const { business } = siteConfig;

  const hoursLines = business.hours
    .map((entry) => {
      const label = DAY_LABELS[entry.day];
      const range = entry.opens && entry.closes ? `${entry.opens}-${entry.closes}` : "Closed";
      return `${label}: ${range}`;
    })
    .join("\n");

  const servicesLines = services
    .map((service) => {
      const price = service.priceFrom !== undefined ? `, from $${service.priceFrom}` : "";
      return `- ${service.name} (${service.durationMinutes} min${price}): ${service.description}`;
    })
    .join("\n");

  // A practice can remove everyone from the dashboard. An empty "Team:"
  // heading invites the model to fill the gap, so say plainly that the list
  // isn't available instead.
  const teamLines =
    team.length > 0
      ? team.map((member) => `- ${member.name}, ${member.role}`).join("\n")
      : "(Not listed. Suggest the visitor call for details about the team.)";

  return `You are a helpful assistant for ${business.name}, answering questions from website visitors.

Business info:
${business.description}
Phone: ${business.phone}
Email: ${business.email}
Address: ${business.address.street}, ${business.address.city}, ${business.address.state} ${business.address.zip}

Hours:
${hoursLines}

Services:
${servicesLines}

Team:
${teamLines}

Only answer questions using the information above. If you don't know something (e.g. real-time availability, billing specifics, or anything not listed here), say so honestly and suggest the visitor call ${business.phone} or use the contact form. Keep answers brief and friendly.`;
}
