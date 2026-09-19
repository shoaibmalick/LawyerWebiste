import { describe, expect, it } from "vitest";
import { buildSystemPrompt } from "./build-system-prompt";

/**
 * A fixture roster, not the real one: test files don't diverge between client
 * repos (CLAUDE.md Conventions), and the next practice employs different
 * people. What matters is that whoever is passed in reaches the prompt.
 */
const TEAM = [
  { name: "Ada Lovelace", role: "Lead Dentist, DDS" },
  { name: "Grace Hopper", role: "Dental Hygienist, RDH" },
];

describe("buildSystemPrompt", () => {
  it("names every team member and their role", () => {
    const prompt = buildSystemPrompt(TEAM);

    for (const member of TEAM) {
      expect(prompt).toContain(member.name);
      expect(prompt).toContain(member.role);
    }
  });

  it("reflects the roster it is given rather than a fixed one", () => {
    // The bug this guards: the roster used to be a module-level config import,
    // so a member removed from the dashboard would still be introduced by the
    // chatbot indefinitely.
    const prompt = buildSystemPrompt([TEAM[0]]);

    expect(prompt).toContain("Ada Lovelace");
    expect(prompt).not.toContain("Grace Hopper");
  });

  it("produces a usable prompt with no team at all", () => {
    // A practice can remove everyone. An empty "Team:" heading is an invitation
    // for the model to invent staff, so it must say something instead.
    const prompt = buildSystemPrompt([]);

    expect(prompt).toContain("Team:");
    expect(prompt).toMatch(/not listed/i);
    expect(prompt).not.toMatch(/Team:\s*\n\s*\n/);
  });

  it("still tells the model to answer only from what it was given", () => {
    // The whole safety property of this bot: it is a lookup over known data,
    // not a general assistant.
    const prompt = buildSystemPrompt(TEAM);

    expect(prompt).toContain("Only answer questions using the information above");
  });

  it("includes the business contact route for anything it can't answer", () => {
    const prompt = buildSystemPrompt(TEAM);

    expect(prompt).toMatch(/contact form/i);
  });

  it("includes the services and hours sections", () => {
    const prompt = buildSystemPrompt(TEAM);

    expect(prompt).toContain("Services:");
    expect(prompt).toContain("Hours:");
  });
});
