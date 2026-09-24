"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { Link } from "@/i18n/navigation";
import { useDisabledPublicTools } from "@/hooks/use-disabled-public-tools";
import { useBrandStore } from "@/store/brand-store";
import {
  visiblePublicCatalog,
  type PublicCatalogAudience,
  type PublicCatalogFormat,
  type PublicCatalogItem,
  type PublicCatalogStorage,
  type PublicCatalogTopic,
  relatedCatalogItems,
} from "@/lib/comms/public-catalog";
import {
  normalizeCatalogSearchText,
  parsePublicCatalogQuery,
  updatePublicCatalogQuery,
  type PublicCatalogQueryState,
} from "@/lib/comms/public-catalog-query";
import { isOfficerHubPublic } from "@/lib/features/officer-hub-public";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";

type ExplorerMode = "create" | "utilities" | "learn" | "search";

const AUDIENCES: readonly PublicCatalogAudience[] = [
  "comms",
  "steward",
  "officer",
  "member",
];
const TOPICS: readonly PublicCatalogTopic[] = [
  "brand",
  "boards",
  "print",
  "social",
  "web",
  "workplace",
  "grievances",
  "safety",
  "governance",
  "bargaining",
  "training",
  "workshops",
  "accessibility",
];
const FORMATS: readonly PublicCatalogFormat[] = [
  "maker",
  "worksheet",
  "playbook",
  "course",
  "workshop",
  "library",
];
const STORAGE: readonly PublicCatalogStorage[] = [
  "on-device",
  "on-device-hub-optional",
  "officer-hub",
  "none",
];

const LEARN_COLLECTIONS = [
  { id: "firstWeek", href: "/learn/first-week" },
  { id: "steward", href: "/learn/steward" },
  { id: "officer", href: "/learn/officer" },
  { id: "workshop", href: "/learn/workshops/comms" },
] as const;

function catalogState(
  q: string,
  audience: string,
  topic: string,
  format: string,
  privacy: string,
): PublicCatalogQueryState {
  return {
    q,
    audience: audience as PublicCatalogAudience | "",
    topic: topic as PublicCatalogTopic | "",
    format: format as PublicCatalogFormat | "",
    privacy: privacy as PublicCatalogStorage | "",
  };
}

function summaryFor(
  item: PublicCatalogItem,
  tTools: ReturnType<typeof useTranslations>,
  tGuides: ReturnType<typeof useTranslations>,
  tCatalog: ReturnType<typeof useTranslations>,
  tOfficer: ReturnType<typeof useTranslations>,
): string {
  if (item.summaryNamespace === "toolsIndex") {
    return tTools(`blurbs.${item.summaryKey}` as never);
  }
  if (item.summaryNamespace === "guidesIndex") {
    return tGuides(`blurbs.${item.summaryKey}` as never);
  }
  if (item.summaryNamespace === "officerLearning") {
    return tOfficer(`modules.${item.summaryKey}.summary` as never);
  }
  return tCatalog(`summaries.${item.summaryKey}` as never);
}

function titleFor(
  item: PublicCatalogItem,
  nav: ReturnType<typeof useTranslations>,
  tOfficer: ReturnType<typeof useTranslations>,
): string {
  if (item.titleNamespace === "officerLearning") {
    return tOfficer(`modules.${item.titleKey}.title` as never);
  }
  return nav(item.titleKey as never);
}

export function PublicCatalogExplorer({
  mode,
  initialState,
}: {
  mode: ExplorerMode;
  initialState: PublicCatalogQueryState;
}) {
  const t = useTranslations("publicCatalog");
  const nav = useTranslations("nav");
  const tools = useTranslations("toolsIndex");
  const guides = useTranslations("guidesIndex");
  const officerLearning = useTranslations("officerLearning");
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && Boolean(session?.user);
  const disabledToolSlugs = useDisabledPublicTools({
    unionId: session?.user?.unionId,
    localId: session?.user?.localId,
  });
  const unionPresetId = useBrandStore((state) => state.brandKit.unionPresetId);
  const available = useMemo(
    () =>
      visiblePublicCatalog({
        authenticated,
        officerHubPublic: isOfficerHubPublic(),
        disabledToolSlugs,
        unionPresetId,
      }),
    [authenticated, disabledToolSlugs, unionPresetId],
  );
  const [query, setQuery] = useState(initialState.q);
  const [audience, setAudience] = useState(initialState.audience);
  const [topic, setTopic] = useState(initialState.topic);
  const [format, setFormat] = useState(initialState.format);
  const [storage, setStorage] = useState(initialState.privacy);
  const writeStateToLocation = useCallback((
    state: PublicCatalogQueryState,
    historyMode: "push" | "replace",
  ) => {
    const params = updatePublicCatalogQuery(
      new URLSearchParams(window.location.search),
      state,
    );
    const suffix = params.toString();
    const nextUrl = `${window.location.pathname}${suffix ? `?${suffix}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentUrl === nextUrl) return;
    window.history[historyMode === "push" ? "pushState" : "replaceState"](
      window.history.state,
      "",
      nextUrl,
    );
  }, []);

  useEffect(() => {
    const syncStateFromLocation = () => {
      const parsed = parsePublicCatalogQuery(new URLSearchParams(window.location.search));
      setQuery(parsed.q);
      setAudience(parsed.audience);
      setTopic(parsed.topic);
      setFormat(parsed.format);
      setStorage(parsed.privacy);
    };
    window.addEventListener("popstate", syncStateFromLocation);
    return () => window.removeEventListener("popstate", syncStateFromLocation);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeStateToLocation(catalogState(query, audience, topic, format, storage), "replace");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, audience, topic, format, storage, writeStateToLocation]);

  const updateFilter = <K extends keyof PublicCatalogQueryState>(
    key: K,
    value: PublicCatalogQueryState[K],
  ) => {
    const next = { ...catalogState(query, audience, topic, format, storage), [key]: value };
    if (key === "q") setQuery(value as string);
    if (key === "audience") setAudience(value as PublicCatalogAudience | "");
    if (key === "topic") setTopic(value as PublicCatalogTopic | "");
    if (key === "format") setFormat(value as PublicCatalogFormat | "");
    if (key === "privacy") setStorage(value as PublicCatalogStorage | "");
    writeStateToLocation(next, "push");
  };

  const items = useMemo(() => {
    const normalizedQuery = normalizeCatalogSearchText(query);
    return available.filter((item) => {
      if (mode === "create") {
        if (item.kind !== "tool" || item.toolSurface !== "create") return false;
      }
      if (mode === "utilities") {
        if (item.kind !== "tool" || item.toolSurface !== "utilities") return false;
      }
      if (mode === "learn" && item.kind === "tool") return false;
      if (audience && !item.audiences.includes(audience as PublicCatalogAudience)) return false;
      if (topic && !item.topics.includes(topic as PublicCatalogTopic)) return false;
      if (format && !item.formats.includes(format as PublicCatalogFormat)) return false;
      if (storage && item.storageMode !== storage) return false;
      if (!normalizedQuery) return true;

      const title = titleFor(item, nav, officerLearning).toLocaleLowerCase();
      const summary = summaryFor(item, tools, guides, t, officerLearning).toLocaleLowerCase();
      const searchTerms = item.searchTermsKey
        ? t(`searchTerms.${item.searchTermsKey}` as never)
        : "";
      const tags = [
        ...item.audiences.map((key) => t(`audiences.${key}`)),
        ...item.topics.map((key) => t(`topics.${key}`)),
        ...item.formats.map((key) => t(`formats.${key}`)),
      ].join(" ").toLocaleLowerCase();
      return normalizeCatalogSearchText(`${title} ${summary} ${tags} ${searchTerms}`)
        .includes(normalizedQuery);
    });
  }, [available, audience, format, guides, mode, nav, officerLearning, query, storage, t, topic, tools]);

  const resetFilters = () => {
    const emptyState: PublicCatalogQueryState = {
      q: "",
      audience: "",
      topic: "",
      format: "",
      privacy: "",
    };
    setQuery("");
    setAudience("");
    setTopic("");
    setFormat("");
    setStorage("");
    writeStateToLocation(emptyState, "push");
  };

  const activeFilters: Array<{ key: keyof PublicCatalogQueryState; label: string; value: string }> = [];
  if (query.trim()) activeFilters.push({ key: "q", label: t("searchLabel"), value: query.trim() });
  if (audience) activeFilters.push({ key: "audience", label: t("audienceFilter"), value: t(`audiences.${audience}` as never) });
  if (topic) activeFilters.push({ key: "topic", label: t("topicFilter"), value: t(`topics.${topic}` as never) });
  if (format) activeFilters.push({ key: "format", label: t("formatFilter"), value: t(`formats.${format}` as never) });
  if (storage) activeFilters.push({ key: "privacy", label: t("privacyFilter"), value: t(`storage.${storage}` as never) });

  const removeFilter = (key: keyof PublicCatalogQueryState) => {
    updateFilter(key, "" as PublicCatalogQueryState[typeof key]);
  };
  const pageTitle =
    mode === "create"
      ? t("createTitle")
      : mode === "utilities"
        ? t("utilitiesTitle")
        : mode === "learn"
          ? t("learnTitle")
          : t("searchTitle");
  const pageIntro =
    mode === "create"
      ? t("createIntro")
      : mode === "utilities"
        ? t("utilitiesIntro")
        : mode === "learn"
          ? t("learnIntro")
          : t("searchIntro");
  const pageEyebrow =
    mode === "create"
      ? t("createEyebrow")
      : mode === "utilities"
        ? t("utilitiesEyebrow")
        : mode === "learn"
          ? t("learnEyebrow")
          : t("searchEyebrow");
  const titleId = `catalog-${mode}-title`;

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-6 md:py-12 xl:px-8">
      <header className="max-w-3xl">
        <Eyebrow>{pageEyebrow}</Eyebrow>
        <h1 id={titleId} className={`${PUBLIC_PAGE_TITLE_CLASS} mt-2`}>{pageTitle}</h1>
        <p className="mt-4 max-w-prose text-base leading-relaxed text-slate-700">{pageIntro}</p>
      </header>

      {mode === "learn" && activeFilters.length === 0 ? (
        <section className="mt-8" aria-labelledby={`${titleId}-collections`}>
          <h2 id={`${titleId}-collections`} className="text-lg font-bold text-opseu-dark">
            {t("learnCollectionsTitle")}
          </h2>
          <ul className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2 xl:grid-cols-4">
            {LEARN_COLLECTIONS.map(({ id, href }) => (
              <li key={id} className="min-w-0">
                <Card variant="ghost" className="h-full p-0">
                  <Link
                    href={href}
                    className="block h-full rounded-xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-inset"
                  >
                    <h3 className="font-bold text-opseu-dark">{t(`learnCollections.${id}Title`)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{t(`learnCollections.${id}Body`)}</p>
                    <span aria-hidden="true" className="mt-3 inline-block text-sm font-semibold text-opseu-blue">→</span>
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8" aria-labelledby={`${titleId}-filters`}>
        <h2 id={`${titleId}-filters`} className="sr-only">{t("filtersTitle")}</h2>
        <Card variant="ghost" className="p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="min-w-0 text-sm font-semibold text-slate-700 sm:col-span-2 lg:col-span-2">
              {t("searchLabel")}
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.currentTarget.value)}
                placeholder={t("searchPlaceholder")}
                className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 font-normal text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
              />
            </label>
            <FilterSelect
              label={t("audienceFilter")}
              value={audience}
              onChange={(value) => updateFilter("audience", value as PublicCatalogQueryState["audience"])}
              allLabel={t("allAudiences")}
              values={AUDIENCES}
              valueLabel={(key) => t(`audiences.${key}`)}
            />
            <FilterSelect
              label={t("topicFilter")}
              value={topic}
              onChange={(value) => updateFilter("topic", value as PublicCatalogQueryState["topic"])}
              allLabel={t("allTopics")}
              values={TOPICS}
              valueLabel={(key) => t(`topics.${key}`)}
            />
            <FilterSelect
              label={t("formatFilter")}
              value={format}
              onChange={(value) => updateFilter("format", value as PublicCatalogQueryState["format"])}
              allLabel={t("allFormats")}
              values={FORMATS}
              valueLabel={(key) => t(`formats.${key}`)}
            />
            <FilterSelect
              label={t("privacyFilter")}
              value={storage}
              onChange={(value) => updateFilter("privacy", value as PublicCatalogQueryState["privacy"])}
              allLabel={t("allPrivacy")}
              values={STORAGE}
              valueLabel={(key) => t(`storage.${key}`)}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p role="status" aria-live="polite" className="text-sm text-slate-600">
              {t("resultCount", { count: items.length })}
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-10 items-center rounded-md px-2 text-sm font-semibold text-opseu-blue underline underline-offset-2 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
            >
              {t("clearFilters")}
            </button>
          </div>
          {activeFilters.length ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold text-slate-600">{t("activeFilters")}</p>
              <ul className="mt-2 flex list-none flex-wrap gap-2 p-0">
                {activeFilters.map(({ key, label, value }) => (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => removeFilter(key)}
                      aria-label={t("removeFilter", { filter: label })}
                      className="inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
                    >
                      <span>{label}: {value}</span><span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </section>

      {items.length ? (
        <ul className="mt-6 grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const title = titleFor(item, nav, officerLearning);
            const summary = summaryFor(item, tools, guides, t, officerLearning);
            const relatedItems = relatedCatalogItems(item);
            return (
              <li key={item.id} className="min-w-0">
                <Card variant="elevated" className="h-full p-0">
                  <div className="h-full rounded-xl p-5 md:p-6">
                    <Link
                      href={item.canonicalPath}
                      className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50 focus-visible:ring-inset"
                    >
                    <div className="flex items-start justify-between gap-3">
                      <Eyebrow tone="muted">{t(`formats.${item.formats[0]}`)}</Eyebrow>
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {t("minutes", { count: item.estimatedMinutes })}
                      </span>
                    </div>
                    <h2 className="mt-3 text-lg font-bold text-opseu-dark group-hover/card:text-opseu-blue">
                      {title}
                      <span aria-hidden="true" className="ml-2 text-sm opacity-60">→</span>
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{summary}</p>
                    <p className="mt-3 text-sm font-semibold leading-relaxed text-opseu-dark">
                      {t(`deliverables.${item.deliverableKey}` as never)}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {item.audiences.map((key) => (
                        <span key={key} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
                          {t(`audiences.${key}`)}
                        </span>
                      ))}
                    </div>
                    <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-600">
                      {t(`storage.${item.storageMode}` as never)}
                    </p>
                    </Link>
                    {relatedItems.length ? (
                      <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-600">
                        <span>{t("relatedLabel")}</span>
                        {relatedItems.map((related, index) => (
                          <span key={related.id}>
                            {index ? <span aria-hidden="true"> · </span> : null}
                            <Link
                              href={related.canonicalPath}
                              className="font-semibold text-opseu-blue underline underline-offset-2 hover:text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
                            >
                              {titleFor(related, nav, officerLearning)}
                            </Link>
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="mt-6" role="status">
          <SectionHeading title={t("noResultsTitle")} intro={t("noResultsBody")} as="h2" />
          <Button type="button" variant="outline" className="mt-4" onClick={resetFilters}>
            {t("clearFilters")}
          </Button>
        </Card>
      )}
    </div>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  allLabel,
  values,
  valueLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  values: readonly T[];
  valueLabel: (value: T) => string;
}) {
  return (
    <label className="min-w-0 text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-1.5 min-h-11 w-full rounded-md border border-slate-300 bg-white px-2.5 font-normal text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50"
      >
        <option value="">{allLabel}</option>
        {values.map((option) => (
          <option key={option} value={option}>{valueLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}
