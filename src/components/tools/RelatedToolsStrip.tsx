"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { documentGeneratorPresetHref } from "@/lib/constants/document-generator-links";

export type RelatedToolLink = {
  href: string;
  label: string;
};

type RelatedToolsStripProps = {
  links: RelatedToolLink[];
  className?: string;
};

/**
 * Cross-tool discoverability footer for public canvas tools.
 */
export function RelatedToolsStrip({ links, className }: RelatedToolsStripProps) {
  const t = useTranslations("relatedTools");
  if (!links.length) return null;

  return (
    <nav className={className} aria-label={t("label")}>
      <p className="text-sm font-semibold text-gray-700">{t("next")}</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center text-sm font-medium text-opseu-blue underline-offset-2 hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Suggested related links by tool slug for workshop consistency. */
export const RELATED_BY_TOOL: Record<
  string,
  { href: string; navKey: string }[]
> = {
  "graphic-maker": [
    { href: "/captions", navKey: "captions" },
    { href: "/examples", navKey: "socialExamples" },
    { href: "/utilities/resizer", navKey: "resizer" },
    { href: "/guide/short-form", navKey: "shortFormGuide" },
  ],
  "flyer-maker": [
    { href: "/create/board-notice", navKey: "boardNotice" },
    { href: "/create/graphic-maker", navKey: "graphicMaker" },
    { href: "/guide/print", navKey: "printGuide" },
  ],
  "board-notice": [
    { href: "/guide/running-meetings", navKey: "runningMeetingsGuide" },
    { href: "/create/flyer-maker", navKey: "flyerMaker" },
    { href: "/create/qr-card", navKey: "qrCard" },
    { href: "/guide/union-boards", navKey: "unionBoardsGuide" },
  ],
  "website-template": [
    { href: "/create/org-chart", navKey: "orgChart" },
    { href: "/brand-kit", navKey: "brandKit" },
    { href: "/utilities/local-pack", navKey: "localPack" },
    { href: "/create/qr-card", navKey: "qrCard" },
    { href: "/guide/website", navKey: "websiteGuide" },
  ],
  "quote-card": [
    { href: "/create/graphic-maker", navKey: "graphicMaker" },
    { href: "/captions", navKey: "captions" },
  ],
  resizer: [
    { href: "/create/logo-builder", navKey: "logoBuilder" },
    { href: "/create/graphic-maker", navKey: "graphicMaker" },
    { href: "/guide/short-form", navKey: "shortFormGuide" },
  ],
  "logo-builder": [
    { href: "/brand-kit", navKey: "brandKit" },
    { href: "/utilities/resizer", navKey: "resizer" },
  ],
  "qr-card": [
    { href: "/create/board-notice", navKey: "boardNotice" },
    { href: "/create/action-card", navKey: "actionCard" },
    { href: "/brand-kit", navKey: "brandKit" },
  ],
  "action-card": [
    { href: "/create/qr-card", navKey: "qrCard" },
    { href: "/create/flyer-maker", navKey: "flyerMaker" },
  ],
  "qr-board": [
    { href: "/create/qr-card", navKey: "qrCard" },
    { href: "/create/solidarity-poster", navKey: "solidarityPoster" },
  ],
  "org-chart": [
    { href: documentGeneratorPresetHref("lec-directory"), navKey: "documentGenerator" },
    { href: "/create/website-template", navKey: "websiteTemplate" },
    { href: "/utilities/local-pack", navKey: "localPack" },
    { href: "/create/board-notice", navKey: "boardNotice" },
    { href: "/guide/union-boards", navKey: "unionBoardsGuide" },
  ],
  "local-pack": [
    { href: "/brand-kit", navKey: "brandKit" },
    { href: "/create/org-chart", navKey: "orgChart" },
    { href: "/create/website-template", navKey: "websiteTemplate" },
  ],
  "solidarity-poster": [
    { href: "/create/meeting-background", navKey: "meetingBackground" },
    { href: "/create/board-notice", navKey: "boardNotice" },
    { href: "/create/qr-card", navKey: "qrCard" },
  ],
  "board-banner": [
    { href: "/create/board-notice", navKey: "boardNotice" },
    { href: "/guide/union-boards", navKey: "unionBoardsGuide" },
  ],
  "meeting-background": [
    { href: "/create/solidarity-poster", navKey: "solidarityPoster" },
    { href: "/create/graphic-maker", navKey: "graphicMaker" },
    { href: "/brand-kit", navKey: "brandKit" },
  ],
  "pulse-poll": [
    { href: "/create/qr-card", navKey: "qrCard" },
    { href: "/create/graphic-maker", navKey: "graphicMaker" },
  ],
  "document-generator": [
    { href: "/create/letter-generator", navKey: "letterGenerator" },
    { href: "/guide/grievance-process", navKey: "grievanceProcessGuide" },
    { href: "/create/org-chart", navKey: "orgChart" },
    { href: "/brand-kit", navKey: "brandKit" },
  ],
  "letter-generator": [
    { href: "/create/document-generator", navKey: "documentGenerator" },
    { href: "/brand-kit", navKey: "brandKit" },
    { href: "/utilities/rtw-accommodation", navKey: "rtwAccommodation" },
  ],
  "grievance-form-builder": [
    { href: "/utilities/complaint-vs-grievance", navKey: "complaintVsGrievance" },
    { href: "/create/document-generator", navKey: "documentGenerator" },
    { href: "/utilities/rtw-accommodation", navKey: "rtwAccommodation" },
  ],
  "ca-snippets": [
    { href: "/utilities/steward-quick-log", navKey: "stewardQuickLog" },
    { href: "/create/document-generator", navKey: "documentGenerator" },
    { href: "/guide/steward-101", navKey: "steward101Guide" },
  ],
  "steward-quick-log": [
    { href: "/utilities/ca-snippets", navKey: "caSnippets" },
    { href: "/utilities/pre-disciplinary-log", navKey: "preDisciplinaryLog" },
    { href: "/guide/steward-101", navKey: "steward101Guide" },
  ],
  "alt-text": [
    { href: "/create/graphic-maker", navKey: "graphicMaker" },
    { href: "/guide/photo-consent", navKey: "photoConsent" },
  ],
  "rtw-accommodation": [
    { href: "/utilities/grievance-form-builder", navKey: "grievanceFormBuilder" },
    { href: "/utilities/complaint-vs-grievance", navKey: "complaintVsGrievance" },
    { href: "/utilities/pre-disciplinary-log", navKey: "preDisciplinaryLog" },
    { href: "/guide/steward-101", navKey: "steward101Guide" },
  ],
  "pre-disciplinary-log": [
    { href: "/utilities/complaint-vs-grievance", navKey: "complaintVsGrievance" },
    { href: "/utilities/rtw-accommodation", navKey: "rtwAccommodation" },
    { href: "/guide/grievance-process", navKey: "grievanceProcessGuide" },
  ],
  "complaint-vs-grievance": [
    { href: "/utilities/pre-disciplinary-log", navKey: "preDisciplinaryLog" },
    { href: "/utilities/rtw-accommodation", navKey: "rtwAccommodation" },
    { href: "/guide/grievance-process", navKey: "grievanceProcessGuide" },
    { href: "/guide/dfr", navKey: "dfrGuide" },
    { href: "/guide/steward-101", navKey: "steward101Guide" },
    { href: "/create/document-generator", navKey: "documentGenerator" },
  ],
  "bylaw-builder": [
    { href: "/guide/bylaws", navKey: "bylawsGuide" },
    { href: "/guide/running-meetings", navKey: "runningMeetingsGuide" },
    { href: "/utilities/rules-of-order", navKey: "rulesOfOrder" },
    { href: "/create/board-notice", navKey: "boardNotice" },
    { href: "/create/org-chart", navKey: "orgChart" },
    { href: "/create/document-generator", navKey: "documentGenerator" },
    { href: "/guide/officer-learning", navKey: "officerLearningGuide" },
    { href: "/utilities/proposal-tracker", navKey: "proposalTracker" },
  ],
  "proposal-tracker": [
    { href: "/guide/bargaining", navKey: "bargainingGuide" },
    { href: "/utilities/bylaw-builder", navKey: "bylawBuilder" },
    { href: "/create/document-generator", navKey: "documentGenerator" },
    { href: "/guide/strike", navKey: "strikeOpsGuide" },
    { href: "/guide/email-broadcast", navKey: "emailBroadcastGuide" },
  ],
  "rules-of-order": [
    { href: "/guide/running-meetings", navKey: "runningMeetingsGuide" },
    { href: "/guide/bylaws", navKey: "bylawsGuide" },
    { href: "/guide/officer-learning", navKey: "officerLearningGuide" },
    { href: "/create/board-notice", navKey: "boardNotice" },
    { href: "/utilities/bylaw-builder", navKey: "bylawBuilder" },
  ],
};
