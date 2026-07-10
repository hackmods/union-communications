export type ExampleCategory =
  | "strike"
  | "spotlight"
  | "agm"
  | "bargaining"
  | "events";

export interface ExamplePost {
  id: string;
  category: ExampleCategory;
  title: string;
  description: string;
  platform: "Facebook" | "Instagram" | "Both";
  accentColor: string;
}

export const EXAMPLE_POSTS: ExamplePost[] = [
  {
    id: "1",
    category: "strike",
    title: "Picket line solidarity post",
    description: "High-contrast graphic with date, time, and location. Clear call to action.",
    platform: "Both",
    accentColor: "#DC2626",
  },
  {
    id: "2",
    category: "spotlight",
    title: "Member spotlight — 20 years of service",
    description: "Photo with name overlay, warm quote, and local branding.",
    platform: "Instagram",
    accentColor: "#003DA5",
  },
  {
    id: "3",
    category: "agm",
    title: "AGM notice with agenda highlights",
    description: "Clean layout with date, virtual link, and key agenda items.",
    platform: "Facebook",
    accentColor: "#002868",
  },
  {
    id: "4",
    category: "bargaining",
    title: "Bargaining table update",
    description: "Quote card from bargaining team with professional tone.",
    platform: "Both",
    accentColor: "#003DA5",
  },
  {
    id: "5",
    category: "events",
    title: "Town hall thank-you graphic",
    description: "Event photo with thank-you headline and member turnout stats.",
    platform: "Facebook",
    accentColor: "#FFFFFF",
  },
  {
    id: "6",
    category: "strike",
    title: "Strike vote results",
    description: "Bold numbers, clear outcome, next steps for members.",
    platform: "Both",
    accentColor: "#DC2626",
  },
];

export const CATEGORY_LABELS: Record<ExampleCategory, string> = {
  strike: "Strike action",
  spotlight: "Member spotlights",
  agm: "AGM notices",
  bargaining: "Bargaining updates",
  events: "Events",
};
