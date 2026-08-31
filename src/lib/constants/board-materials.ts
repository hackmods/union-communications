/**
 * Union board feed materials - official Ontario posters locals can print
 * when they lack content, plus anonymized local demo templates.
 * No real member names or college-specific identifiers.
 */

import { commsSourceUrl } from "@/lib/constants/comms-sources";

export type BoardMaterialKind =
  | "ministryPoster"
  | "ministryLink"
  | "localTemplate"
  | "examplePhoto";

export type BoardPdfReferenceId = "board-checklist" | "ohsa-qr-tip";

export interface BoardMaterial {
  id: string;
  kind: BoardMaterialKind;
  /** i18n key under unionBoardsGuide.materials.items.* */
  titleKey: string;
  descriptionKey: string;
  /** Public path or absolute URL (posters, spreadsheets, photos). */
  href?: string;
  /** Branded PDF download for local templates (Union Boards guide). */
  pdfReference?: BoardPdfReferenceId;
  /** When true, offer Excel download alongside CSV href. */
  offerXlsx?: boolean;
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
    officialUrl: commsSourceUrl("ontario-esa-poster"),
    zone: "healthSafety",
  },
  {
    id: "esa-poster-alt",
    kind: "ministryPoster",
    titleKey: "esaPosterAlt",
    descriptionKey: "esaPosterAltDesc",
    href: "/assets/ontario-board-posters/esa-poster-mltsd-2020.pdf",
    officialUrl: commsSourceUrl("ontario-required-posters"),
    zone: "healthSafety",
  },
  {
    id: "form82",
    kind: "ministryPoster",
    titleKey: "form82",
    descriptionKey: "form82Desc",
    href: "/assets/ontario-board-posters/wsib-in-case-of-injury-form82.pdf",
    officialUrl: commsSourceUrl("ontario-required-posters"),
    zone: "healthSafety",
  },
  {
    id: "ohsa-elaws",
    kind: "ministryLink",
    titleKey: "ohsa",
    descriptionKey: "ohsaDesc",
    href: commsSourceUrl("ontario-ohsa"),
    officialUrl: commsSourceUrl("ontario-ohsa-guide"),
    zone: "healthSafety",
  },
  {
    id: "ohsa-guide",
    kind: "ministryLink",
    titleKey: "ohsaGuide",
    descriptionKey: "ohsaGuideDesc",
    href: commsSourceUrl("ontario-ohsa-guide"),
    zone: "healthSafety",
  },
  {
    id: "required-posters-hub",
    kind: "ministryLink",
    titleKey: "requiredPostersHub",
    descriptionKey: "requiredPostersHubDesc",
    href: commsSourceUrl("ontario-required-posters"),
    zone: "healthSafety",
  },
  {
    id: "board-checklist",
    kind: "localTemplate",
    titleKey: "boardChecklist",
    descriptionKey: "boardChecklistDesc",
    pdfReference: "board-checklist",
    zone: "header",
  },
  {
    id: "board-tracker",
    kind: "localTemplate",
    titleKey: "boardTracker",
    descriptionKey: "boardTrackerDesc",
    href: "/demo/union-boards/board-tracker-sample.csv",
    offerXlsx: true,
    zone: "lec",
  },
  {
    id: "jhsc-sample",
    kind: "localTemplate",
    titleKey: "jhscSample",
    descriptionKey: "jhscSampleDesc",
    href: "/demo/union-boards/jhsc-member-list-sample.csv",
    offerXlsx: true,
    zone: "healthSafety",
  },
  {
    id: "ohsa-qr-tip",
    kind: "localTemplate",
    titleKey: "ohsaQrTip",
    descriptionKey: "ohsaQrTipDesc",
    pdfReference: "ohsa-qr-tip",
    zone: "healthSafety",
  },
  {
    id: "board-l33",
    kind: "examplePhoto",
    titleKey: "boardL33",
    descriptionKey: "boardL33Desc",
    href: "/demo/union-boards/board-l33-sectioned.png",
    zone: "header",
  },
  {
    id: "board-w010",
    kind: "examplePhoto",
    titleKey: "boardW010",
    descriptionKey: "boardW010Desc",
    href: "/demo/union-boards/board-w010-branded.png",
    zone: "header",
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
