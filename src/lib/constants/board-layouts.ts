/** IRL-inspired union board layout patterns — generic, no union names. */

export type BoardZoneId =
  | "header"
  | "socials"
  | "healthSafety"
  | "lec"
  | "events"
  | "filler";

export interface BoardZone {
  id: BoardZoneId;
  /** CSS grid area name */
  area: string;
}

export interface BoardLayoutReference {
  id: string;
  /** i18n key under unionBoardsGuide.layouts.* */
  titleKey: string;
  descriptionKey: string;
  bestForKey: string;
  /** Tailwind grid-template-areas rows */
  areas: string[];
  zones: BoardZone[];
}

/**
 * Bare-minimum zones every local board should cover.
 * Order matches print checklist priority.
 */
export const BARE_MINIMUM_ZONES: readonly BoardZoneId[] = [
  "header",
  "socials",
  "healthSafety",
  "lec",
  "events",
] as const;

export const BOARD_LAYOUT_REFERENCES: readonly BoardLayoutReference[] = [
  {
    id: "four-quadrant",
    titleKey: "fourQuadrant",
    descriptionKey: "fourQuadrantDesc",
    bestForKey: "fourQuadrantBest",
    areas: [
      "header header",
      "socials health",
      "lec lec",
      "events events",
    ],
    zones: [
      { id: "header", area: "header" },
      { id: "socials", area: "socials" },
      { id: "healthSafety", area: "health" },
      { id: "lec", area: "lec" },
      { id: "events", area: "events" },
    ],
  },
  {
    id: "priority-strip",
    titleKey: "priorityStrip",
    descriptionKey: "priorityStripDesc",
    bestForKey: "priorityStripBest",
    areas: [
      "header header header",
      "socials events events",
      "health events events",
      "lec events events",
    ],
    zones: [
      { id: "header", area: "header" },
      { id: "socials", area: "socials" },
      { id: "healthSafety", area: "health" },
      { id: "lec", area: "lec" },
      { id: "events", area: "events" },
    ],
  },
  {
    id: "corridor-tall",
    titleKey: "corridorTall",
    descriptionKey: "corridorTallDesc",
    bestForKey: "corridorTallBest",
    areas: ["header", "socials", "health", "lec", "events", "filler"],
    zones: [
      { id: "header", area: "header" },
      { id: "socials", area: "socials" },
      { id: "healthSafety", area: "health" },
      { id: "lec", area: "lec" },
      { id: "events", area: "events" },
      { id: "filler", area: "filler" },
    ],
  },
  {
    id: "labeled-columns",
    titleKey: "labeledColumns",
    descriptionKey: "labeledColumnsDesc",
    bestForKey: "labeledColumnsBest",
    areas: [
      "header header header header",
      "events lec health socials",
      "events lec health filler",
    ],
    zones: [
      { id: "header", area: "header" },
      { id: "events", area: "events" },
      { id: "lec", area: "lec" },
      { id: "healthSafety", area: "health" },
      { id: "socials", area: "socials" },
      { id: "filler", area: "filler" },
    ],
  },
  {
    id: "steward-desk",
    titleKey: "stewardDesk",
    descriptionKey: "stewardDeskDesc",
    bestForKey: "stewardDeskBest",
    areas: [
      "header header header",
      "lec lec socials",
      "lec lec health",
      "events events events",
    ],
    zones: [
      { id: "header", area: "header" },
      { id: "lec", area: "lec" },
      { id: "socials", area: "socials" },
      { id: "healthSafety", area: "health" },
      { id: "events", area: "events" },
    ],
  },
] as const;
