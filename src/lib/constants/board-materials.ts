/**
 * Union board feed materials — official Ontario posters locals can print
 * when they lack content, plus anonymized local demo templates.
 * No real member names or college-specific identifiers.
 */

export type BoardMaterialKind =
  | "ministryPoster"
  | "ministryLink"
  | "localTemplate"
  | "examplePhoto";

export interface BoardMaterial {
  id: string;
  kind: BoardMaterialKind;
  /** i18n key under unionBoardsGuide.materials.items.* */
  titleKey: string;
  descriptionKey: string;
  /** Public path or absolute URL */
  href: string;
  /** Optional official source page (ministry) */
  officialUrl?: string;
  /** Suggested bare-minimum zone */
  zone?: "healthSafety" | "socials" | "lec" | "events" | "header" | "filler";
}

export const BOARD_MATERIALS: readonly BoardMaterial[] = [
  {
    id: "esa-poster",
    kind: "ministryPoster",
    titleKey: "esaPoster",
    descriptionKey: "esaPosterDesc",
    href: "/assets/ontario-board-posters/esa-employment-standards-poster.pdf",
    officialUrl: "https://www.ontario.ca/document/your-guide-employment-standards-act-0/mandatory-information-employees",
    zone: "healthSafety",
  },
  {
    id: "esa-poster-alt",
    kind: "ministryPoster",
    titleKey: "esaPosterAlt",
    descriptionKey: "esaPosterAltDesc",
    href: "/assets/ontario-board-posters/esa-poster-mltsd-2020.pdf",
    officialUrl: "https://www.ontario.ca/page/posters-required-workplace",
    zone: "healthSafety",
  },
  {
    id: "form82",
    kind: "ministryPoster",
    titleKey: "form82",
    descriptionKey: "form82Desc",
    href: "/assets/ontario-board-posters/wsib-in-case-of-injury-form82.pdf",
    officialUrl: "https://www.ontario.ca/page/posters-required-workplace",
    zone: "healthSafety",
  },
  {
    id: "ohsa-elaws",
    kind: "ministryLink",
    titleKey: "ohsa",
    descriptionKey: "ohsaDesc",
    href: "https://www.ontario.ca/laws/statute/90o01",
    officialUrl: "https://www.ontario.ca/document/guide-occupational-health-and-safety-act",
    zone: "healthSafety",
  },
  {
    id: "ohsa-guide",
    kind: "ministryLink",
    titleKey: "ohsaGuide",
    descriptionKey: "ohsaGuideDesc",
    href: "https://www.ontario.ca/document/guide-occupational-health-and-safety-act",
    zone: "healthSafety",
  },
  {
    id: "required-posters-hub",
    kind: "ministryLink",
    titleKey: "requiredPostersHub",
    descriptionKey: "requiredPostersHubDesc",
    href: "https://www.ontario.ca/page/posters-required-workplace",
    zone: "healthSafety",
  },
  {
    id: "board-checklist",
    kind: "localTemplate",
    titleKey: "boardChecklist",
    descriptionKey: "boardChecklistDesc",
    href: "/demo/union-boards/board-print-checklist.md",
    zone: "header",
  },
  {
    id: "board-tracker",
    kind: "localTemplate",
    titleKey: "boardTracker",
    descriptionKey: "boardTrackerDesc",
    href: "/demo/union-boards/board-tracker-sample.csv",
    zone: "lec",
  },
  {
    id: "jhsc-sample",
    kind: "localTemplate",
    titleKey: "jhscSample",
    descriptionKey: "jhscSampleDesc",
    href: "/demo/union-boards/jhsc-member-list-sample.csv",
    zone: "healthSafety",
  },
  {
    id: "ohsa-qr-tip",
    kind: "localTemplate",
    titleKey: "ohsaQrTip",
    descriptionKey: "ohsaQrTipDesc",
    href: "/demo/union-boards/ohsa-qr-access-tip.md",
    zone: "healthSafety",
  },
  {
    id: "dense-board-photo",
    kind: "examplePhoto",
    titleKey: "denseBoardPhoto",
    descriptionKey: "denseBoardPhotoDesc",
    href: "/demo/union-boards/example-dense-board.jpg",
    zone: "filler",
  },
] as const;

export function materialsByKind(kind: BoardMaterialKind): BoardMaterial[] {
  return BOARD_MATERIALS.filter((m) => m.kind === kind);
}
