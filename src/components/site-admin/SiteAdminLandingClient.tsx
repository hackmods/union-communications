"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SiteAdminCard } from "@/components/site-admin/SiteAdminCard";

export type SiteAdminLandingCard = {
  id: string;
  href: string;
  title: string;
  body: string;
  tone?: "default" | "warn";
};

export type SiteAdminLandingSectionId =
  | "usersAccess"
  | "contentComms"
  | "complianceTrust"
  | "hostOps";

export type SiteAdminLandingSection = {
  id: SiteAdminLandingSectionId;
  cards: SiteAdminLandingCard[];
};

type SiteAdminLandingClientProps = {
  sections: SiteAdminLandingSection[];
};

const SECTION_TITLE_KEY: Record<
  SiteAdminLandingSectionId,
  "siteAdminSectionUsersAccess" | "siteAdminSectionContentComms" | "siteAdminSectionComplianceTrust" | "siteAdminSectionHostOps"
> = {
  usersAccess: "siteAdminSectionUsersAccess",
  contentComms: "siteAdminSectionContentComms",
  complianceTrust: "siteAdminSectionComplianceTrust",
  hostOps: "siteAdminSectionHostOps",
};

export function SiteAdminLandingClient({ sections }: SiteAdminLandingClientProps) {
  const t = useTranslations("hub.platformOperator");
  const [query, setQuery] = useState("");

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        cards: section.cards.filter(
          (card) =>
            card.title.toLowerCase().includes(q) ||
            card.body.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.cards.length > 0);
  }, [query, sections]);

  return (
    <div className="space-y-8">
      <label className="block">
        <span className="sr-only">{t("siteAdminFilterLabel")}</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("siteAdminFilterPlaceholder")}
          className="w-full rounded-md border border-opseu-gray/30 bg-white px-3 py-2 text-sm shadow-sm focus:border-opseu-blue focus:outline-none focus:ring-2 focus:ring-opseu-blue/30"
        />
      </label>

      {filteredSections.length === 0 ? (
        <p className="text-sm text-opseu-gray-dark">{t("siteAdminFilterEmpty")}</p>
      ) : (
        filteredSections.map((section) => (
          <section key={section.id} aria-labelledby={`site-admin-${section.id}`}>
            <h2
              id={`site-admin-${section.id}`}
              className="mb-3 text-sm font-semibold uppercase tracking-wide text-opseu-gray-dark"
            >
              {t(SECTION_TITLE_KEY[section.id])}
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {section.cards.map((card) => (
                <SiteAdminCard
                  key={card.id}
                  href={card.href}
                  title={card.title}
                  body={card.body}
                  tone={card.tone}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
