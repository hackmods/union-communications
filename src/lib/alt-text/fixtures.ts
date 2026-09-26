/**
 * Curated alt-text drafts for AODA-oriented regression locks.
 * Driven through `analyzeAltText` / `exceedsLimit` — not a steward content library.
 */

export type AltTextFixture = {
  id: string;
  draft: string;
  caption?: string;
  /** Issues expected from `analyzeAltText`. */
  expectIssues: string[];
  /** When true, draft must exceed the strictest platform alt limit. */
  expectExceedsLimit?: boolean;
};

export const ALT_TEXT_FIXTURES: AltTextFixture[] = [
  {
    id: "good-meeting-graphic",
    draft:
      "Blue graphic: Local 243 membership meeting Thursday 5pm in Room 204. Union logo top left, date and location in white text.",
    expectIssues: [],
  },
  {
    id: "empty",
    draft: "   ",
    expectIssues: ["empty"],
  },
  {
    id: "starts-with-image-of",
    draft: "Photo of a rally outside the college gates.",
    expectIssues: ["startsWithImageOf"],
  },
  {
    id: "caption-duplicate",
    draft: "Join us Thursday at 5pm for the membership meeting.",
    caption: "Join us Thursday at 5pm for the membership meeting.",
    expectIssues: ["sameAsCaption"],
  },
  {
    id: "too-long",
    draft: `Wide banner graphic. ${"Member meeting details and location notes. ".repeat(40)}`,
    expectIssues: [],
    expectExceedsLimit: true,
  },
];
