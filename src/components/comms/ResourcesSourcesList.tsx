"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  COMMS_SOURCES,
  filterSourcesByUnion,
  getSourcesByCategory,
  type CommsSourceCategory,
} from "@/lib/constants/comms-sources";
import { useBrandStore } from "@/store/brand-store";

const categoryOrder: CommsSourceCategory[] = [
  "branding",
  "website",
  "union",
  "platform",
  "accessibility",
];

export function ResourcesSourcesList() {
  const t = useTranslations("resources");
  const ts = useTranslations("sources");
  const unionPresetId = useBrandStore((s) => s.brandKit.unionPresetId);
  const hydrated = useBrandStore((s) => s.hydrated);
  const filtered = filterSourcesByUnion(
    Object.values(COMMS_SOURCES),
    hydrated ? unionPresetId : undefined,
  );
  const byCategory = getSourcesByCategory(filtered);
  const preset = hydrated ? unionPresetId?.trim() : "";
  const showScopeNote = Boolean(preset && preset !== "opseu");

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-opseu-dark">{t("allSources.title")}</h2>
      <p className="mt-2 text-gray-600">{t("allSources.intro")}</p>
      {showScopeNote && (
        <p className="mt-2 text-sm text-gray-600">
          {t("allSources.scopedNote")}{" "}
          <Link href="/brand-kit" className="font-medium text-opseu-blue underline">
            {t("allSources.brandKitLink")}
          </Link>
        </p>
      )}

      <div className="mt-6 space-y-8">
        {categoryOrder.map((category) => {
          const sources = byCategory[category];
          if (sources.length === 0) return null;
          return (
            <section
              key={category}
              className="border-l-2 border-opseu-blue/30 pl-5"
            >
              <h3 className="text-base font-bold text-opseu-dark">
                {ts(`categories.${category}`)}
              </h3>
              <ul className="mt-3 space-y-3">
                {sources.map((source) => (
                  <li
                    key={source.id}
                    className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-opseu-blue underline"
                    >
                      {source.label}
                    </a>
                    <p className="mt-1 text-sm text-gray-600">{source.note}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
