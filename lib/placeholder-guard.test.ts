import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertNoPlaceholders,
  isPlaceholder,
  PLACEHOLDER_PREFIX,
  PlaceholderInProductionError,
} from "./placeholder-guard";

afterEach(() => {
  // Restored after every case, so one test cannot change what every later test
  // believes the environment is — this guard's whole behaviour turns on it.
  vi.unstubAllEnvs();
});

/**
 * `vi.stubEnv` rather than assigning to process.env: NODE_ENV is a getter on
 * that object and a plain defineProperty is rejected outright.
 */
function setNodeEnv(value: string) {
  vi.stubEnv("NODE_ENV", value as "production" | "development" | "test");
}

/** A production build aimed at a real public host — the case that must fail. */
function setPublicDeploy() {
  setNodeEnv("production");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goldenfork.ca");
}

describe("isPlaceholder", () => {
  /**
   * The check is exact, not heuristic. Spec 11 is explicit that the question is
   * "is this one of the known sentinels", because a heuristic that guesses at
   * "looks fake" will both miss real placeholders and reject real content — and
   * a guard that cries wolf gets switched off.
   */
  it("recognises a sentinel", () => {
    expect(isPlaceholder(`${PLACEHOLDER_PREFIX}_VERIFIED_PHONE`)).toBe(true);
    expect(isPlaceholder(`${PLACEHOLDER_PREFIX}_VERIFIED_ADDRESS`)).toBe(true);
  });

  it("recognises a sentinel with surrounding copy", () => {
    // Real placeholder copy reads as a sentence — see app/visit/page.tsx.
    expect(isPlaceholder(`${PLACEHOLDER_PREFIX}_VERIFIED_PARKING — to be confirmed.`)).toBe(true);
  });

  it("treats a missing value as a placeholder", () => {
    expect(isPlaceholder(undefined)).toBe(true);
    expect(isPlaceholder(null)).toBe(true);
    expect(isPlaceholder("")).toBe(true);
    expect(isPlaceholder("   ")).toBe(true);
  });

  it("leaves real content alone", () => {
    expect(isPlaceholder("(416) 555-0142")).toBe(false);
    expect(isPlaceholder("122 Ossington Avenue")).toBe(false);
  });

  /**
   * The prefix is unmistakable on purpose, so a real menu description mentioning
   * the word "placeholder" is not mistaken for one.
   */
  it("does not fire on the word placeholder in ordinary prose", () => {
    expect(isPlaceholder("Our placeholder-free approach to sourcing")).toBe(false);
    expect(isPlaceholder("PLACEHOLDER — street address not yet supplied")).toBe(false);
  });
});

describe("assertNoPlaceholders", () => {
  const withPlaceholder = {
    "business.phone": `${PLACEHOLDER_PREFIX}_VERIFIED_PHONE`,
    "business.name": "Golden Fork",
  };

  /**
   * PL3 — a development build renders placeholders visibly and does not fail,
   * so the site stays buildable and reviewable while content is still coming in.
   */
  it("allows placeholders in development", () => {
    setNodeEnv("development");

    expect(() => assertNoPlaceholders(withPlaceholder, "config/site.config.ts")).not.toThrow();
  });

  it("allows them in test, so the suite does not need real business data", () => {
    setNodeEnv("test");

    expect(() => assertNoPlaceholders(withPlaceholder, "config/site.config.ts")).not.toThrow();
  });

  /** PL1 — a production build fails. */
  it("refuses them in production", () => {
    setPublicDeploy();

    expect(() => assertNoPlaceholders(withPlaceholder, "config/site.config.ts")).toThrow(
      PlaceholderInProductionError,
    );
  });

  /**
   * PL1 again: the error names the field *and* the file. "A placeholder was
   * found" sends someone hunting through a repo; naming both makes it a
   * one-minute fix, which is the difference between the guard being respected
   * and being disabled.
   */
  it("names every offending field and the file it lives in", () => {
    setPublicDeploy();

    let message = "";
    try {
      assertNoPlaceholders(
        {
          "business.phone": `${PLACEHOLDER_PREFIX}_VERIFIED_PHONE`,
          "business.address.street": `${PLACEHOLDER_PREFIX}_VERIFIED_ADDRESS`,
          "business.name": "Golden Fork",
        },
        "config/site.config.ts",
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("business.phone");
    expect(message).toContain("business.address.street");
    expect(message).toContain("config/site.config.ts");
    // Not the field that was fine.
    expect(message).not.toContain("business.name");
  });

  it("passes silently when everything is real", () => {
    setPublicDeploy();

    expect(() =>
      assertNoPlaceholders({ "business.phone": "(416) 555-0142" }, "config/site.config.ts"),
    ).not.toThrow();
  });

  /**
   * PL4 — the guard reads resolved configuration, so a value supplied by an
   * environment variable in production is caught exactly like a committed one.
   * Nothing in the signature lets a caller pass the source file instead.
   */
  it("catches a placeholder that arrived from the environment", () => {
    setPublicDeploy();
    const resolved = { "business.phone": process.env.TEST_ONLY_PHONE ?? "" };

    expect(() => assertNoPlaceholders(resolved, "environment")).toThrow(
      PlaceholderInProductionError,
    );
  });
});

/**
 * Where the build thinks it lives decides whether the guard bites.
 *
 * CI runs a production build on every push to prove the app compiles. Failing
 * that would leave the repo permanently red while content is still being
 * gathered, and a guard that blocks all work is a guard that gets deleted.
 */
describe("which builds are enforced", () => {
  const placeholder = { "business.phone": `${PLACEHOLDER_PREFIX}_VERIFIED_PHONE` };

  it("lets a production build aimed at localhost through — this is CI", () => {
    setNodeEnv("production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    expect(() => assertNoPlaceholders(placeholder, "config/site.config.ts")).not.toThrow();
  });

  it("refuses a production build aimed at the real domain", () => {
    setNodeEnv("production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://goldenfork.ca");

    expect(() => assertNoPlaceholders(placeholder, "config/site.config.ts")).toThrow(
      PlaceholderInProductionError,
    );
  });

  /**
   * An unconfigured production deploy is the one most likely to be a mistake,
   * so absence fails rather than passes.
   */
  it("refuses a production build that does not say where it lives", () => {
    setNodeEnv("production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");

    expect(() => assertNoPlaceholders(placeholder, "config/site.config.ts")).toThrow(
      PlaceholderInProductionError,
    );
  });
});

/**
 * The second half of the problem, and the one that actually reached a repo.
 *
 * A sentinel is only found where somebody was disciplined enough to leave one.
 * Golden Fork's intake sheet came back with a street address, a city, a
 * province code and a postal code that are all fictional — and none of them say
 * REPLACE_WITH, because a person filling in a form writes something that looks
 * like an answer. The sentinel check passes them and the site publishes a
 * fictional business to search engines, which is the exact failure spec 11
 * exists to prevent.
 *
 * So a caller may additionally name values it knows are provisional. Exact
 * strings, still no heuristic — the caller knows which of its own values are
 * unverified, and asking it is reliable in a way that guessing is not.
 */
describe("provisional values", () => {
  const PROVISIONAL = ["742 Evergreen Terrace", "Dream City"];

  it("counts a named provisional value as a placeholder", () => {
    expect(isPlaceholder("742 Evergreen Terrace", PROVISIONAL)).toBe(true);
    expect(isPlaceholder("Dream City", PROVISIONAL)).toBe(true);
  });

  it("leaves everything else alone", () => {
    expect(isPlaceholder("14 Duncan Street", PROVISIONAL)).toBe(false);
    expect(isPlaceholder("Toronto", PROVISIONAL)).toBe(false);
  });

  /**
   * Trimmed on both sides, like the sentinel check — a trailing space in a
   * config file must not be what decides whether a fake address ships.
   */
  it("ignores surrounding whitespace", () => {
    expect(isPlaceholder("  Dream City  ", PROVISIONAL)).toBe(true);
  });

  /**
   * Case-sensitive and whole-value. "Dream City Bistro" is a plausible real
   * business name, and a substring match would refuse to deploy it forever.
   */
  it("matches the whole value, not a substring of it", () => {
    expect(isPlaceholder("Dream City Bistro", PROVISIONAL)).toBe(false);
  });

  it("still lets a build reach localhost, so the site stays reviewable", () => {
    setNodeEnv("production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");

    expect(() =>
      assertNoPlaceholders(
        { "business.address.street": "742 Evergreen Terrace" },
        "config/site.config.ts",
        PROVISIONAL,
      ),
    ).not.toThrow();
  });

  it("refuses a public deploy carrying one, and names the field", () => {
    setPublicDeploy();

    expect(() =>
      assertNoPlaceholders(
        { "business.address.street": "742 Evergreen Terrace" },
        "config/site.config.ts",
        PROVISIONAL,
      ),
    ).toThrow(/business\.address\.street/);
  });

  /**
   * Omitting the argument must behave exactly as before, or merging this into a
   * client repo that has not adopted it changes that repo's behaviour silently.
   */
  it("changes nothing when no provisional values are given", () => {
    setPublicDeploy();

    expect(() =>
      assertNoPlaceholders(
        { "business.address.street": "742 Evergreen Terrace" },
        "config/site.config.ts",
      ),
    ).not.toThrow();
  });
});
