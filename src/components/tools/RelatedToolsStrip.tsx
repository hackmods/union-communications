"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

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
    { href: "/tools/resizer", navKey: "resizer" },
    { href: "/guide/short-form", navKey: "shortFormGuide" },
  ],
  "flyer-maker": [
    { href: "/tools/board-notice", navKey: "boardNotice" },
    { href: "/tools/graphic-maker", navKey: "graphicMaker" },
    { href: "/guide/print", navKey: "printGuide" },
  ],
  "board-notice": [
    { href: "/tools/flyer-maker", navKey: "flyerMaker" },
    { href: "/tools/qr-card", navKey: "qrCard" },
    { href: "/guide/union-boards", navKey: "unionBoardsGuide" },
  ],
  "website-template": [
    { href: "/tools/org-chart", navKey: "orgChart" },
    { href: "/brand-kit", navKey: "brandKit" },
    { href: "/tools/qr-card", navKey: "qrCard" },
    { href: "/guide/website", navKey: "websiteGuide" },
  ],
  "quote-card": [
    { href: "/tools/graphic-maker", navKey: "graphicMaker" },
    { href: "/captions", navKey: "captions" },
  ],
  resizer: [
    { href: "/tools/logo-builder", navKey: "logoBuilder" },
    { href: "/tools/graphic-maker", navKey: "graphicMaker" },
    { href: "/guide/short-form", navKey: "shortFormGuide" },
  ],
  "logo-builder": [
    { href: "/brand-kit", navKey: "brandKit" },
    { href: "/tools/resizer", navKey: "resizer" },
  ],
  "qr-card": [
    { href: "/tools/board-notice", navKey: "boardNotice" },
    { href: "/tools/action-card", navKey: "actionCard" },
    { href: "/brand-kit", navKey: "brandKit" },
  ],
  "action-card": [
    { href: "/tools/qr-card", navKey: "qrCard" },
    { href: "/tools/flyer-maker", navKey: "flyerMaker" },
  ],
  "qr-board": [
    { href: "/tools/qr-card", navKey: "qrCard" },
    { href: "/tools/solidarity-poster", navKey: "solidarityPoster" },
  ],
  "org-chart": [
    { href: "/tools/document-generator?preset=lec-directory", navKey: "documentGenerator" },
    { href: "/tools/website-template", navKey: "websiteTemplate" },
    { href: "/tools/board-notice", navKey: "boardNotice" },
    { href: "/guide/union-boards", navKey: "unionBoardsGuide" },
  ],
  "solidarity-poster": [
    { href: "/tools/meeting-background", navKey: "meetingBackground" },
    { href: "/tools/board-notice", navKey: "boardNotice" },
    { href: "/tools/qr-card", navKey: "qrCard" },
  ],
  "board-banner": [
    { href: "/tools/board-notice", navKey: "boardNotice" },
    { href: "/guide/union-boards", navKey: "unionBoardsGuide" },
  ],
  "meeting-background": [
    { href: "/tools/solidarity-poster", navKey: "solidarityPoster" },
    { href: "/tools/graphic-maker", navKey: "graphicMaker" },
    { href: "/brand-kit", navKey: "brandKit" },
  ],
  "pulse-poll": [
    { href: "/tools/qr-card", navKey: "qrCard" },
    { href: "/tools/graphic-maker", navKey: "graphicMaker" },
  ],
  "document-generator": [
    { href: "/guide/grievance-process", navKey: "grievanceProcessGuide" },
    { href: "/tools/org-chart", navKey: "orgChart" },
    { href: "/brand-kit", navKey: "brandKit" },
    { href: "/tools/board-notice", navKey: "boardNotice" },
  ],
  "alt-text": [
    { href: "/tools/graphic-maker", navKey: "graphicMaker" },
    { href: "/guide/photo-consent", navKey: "photoConsent" },
  ],
  "rtw-accommodation": [
    { href: "/tools/complaint-vs-grievance", navKey: "complaintVsGrievance" },
    { href: "/tools/pre-disciplinary-log", navKey: "preDisciplinaryLog" },
    { href: "/guide/steward-101", navKey: "steward101Guide" },
  ],
  "pre-disciplinary-log": [
    { href: "/tools/complaint-vs-grievance", navKey: "complaintVsGrievance" },
    { href: "/tools/rtw-accommodation", navKey: "rtwAccommodation" },
    { href: "/guide/grievance-process", navKey: "grievanceProcessGuide" },
  ],
  "complaint-vs-grievance": [
    { href: "/tools/pre-disciplinary-log", navKey: "preDisciplinaryLog" },
    { href: "/tools/rtw-accommodation", navKey: "rtwAccommodation" },
    { href: "/guide/grievance-process", navKey: "grievanceProcessGuide" },
    { href: "/guide/dfr", navKey: "dfrGuide" },
    { href: "/guide/steward-101", navKey: "steward101Guide" },
    { href: "/tools/document-generator", navKey: "documentGenerator" },
  ],
  "bylaw-builder": [
    { href: "/guide/bylaws", navKey: "bylawsGuide" },
    { href: "/tools/board-notice", navKey: "boardNotice" },
    { href: "/tools/org-chart", navKey: "orgChart" },
    { href: "/tools/document-generator", navKey: "documentGenerator" },
    { href: "/guide/officer-learning", navKey: "officerLearningGuide" },
  ],
};
