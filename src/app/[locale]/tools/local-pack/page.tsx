"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { PageShell } from "@/components/layout/PageShell";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useBrandStore } from "@/store/brand-store";
import { usePublicRosterStore } from "@/store/public-roster-store";
import { usePreferencesStore } from "@/store/preferences-store";
import { useWebsiteDraftStore } from "@/store/website-draft-store";
import { resolveLocalNumber } from "@/lib/utils";
import { serializePublicRosterCsv } from "@/lib/org-chart";
import {
  buildLocalPack,
  localPackFilename,
  parseLocalPackText,
  serializeLocalPack,
  type LocalPackParseCode,
} from "@/lib/local-pack";

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LocalPackPage() {
  const t = useTranslations("localPack");
  const tc = useTranslations("common");
  const brandKit = useBrandStore((s) => s.brandKit);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const importBrandKit = useBrandStore((s) => s.importBrandKit);
  const setOnboardingComplete = useBrandStore((s) => s.setOnboardingComplete);
  const roster = usePublicRosterStore((s) => s.roster);
  const importRoster = usePublicRosterStore((s) => s.importRoster);
  const preferences = usePreferencesStore((s) => s.preferences);
  const setPreferences = usePreferencesStore((s) => s.setPreferences);
  const draft = useWebsiteDraftStore((s) => s.draft);
  const replaceDraft = useWebsiteDraftStore((s) => s.replaceDraft);
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "danger">("success");
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

  const localNumber = resolveLocalNumber(brandKit.local.localNumber);

  const importErrorMessage = (code: LocalPackParseCode): string => {
    if (code === "wrongKind") return t("errorWrongKind");
    if (code === "unsupportedVersion") return t("errorUnsupportedVersion");
    if (code === "invalidSection") return t("errorInvalidSection");
    if (code === "empty") return t("errorEmpty");
    return t("errorInvalidJson");
  };

  const handleExport = () => {
    void runExport(async () => {
      const pack = buildLocalPack({
        brandKit,
        publicRoster: roster,
        preferences,
        onboardingComplete,
        websiteDraft: draft,
      });
      downloadText(
        localPackFilename(localNumber),
        serializeLocalPack(pack),
        "application/json",
      );
    });
  };

  const handleExportRosterCsv = () => {
    downloadText(
      `org-chart-local-${localNumber}.csv`,
      serializePublicRosterCsv(roster),
      "text/csv;charset=utf-8",
    );
    setTone("success");
    setMessage(t("csvSuccess"));
  };

  const handleImport = async (file: File) => {
    setMessage(null);
    try {
      const text = await file.text();
      const parsed = parseLocalPackText(text);
      if (!parsed.ok) {
        setTone("danger");
        setMessage(importErrorMessage(parsed.code));
        return;
      }
      const { pack } = parsed;
      if (pack.brandKit) {
        importBrandKit(pack.brandKit);
      }
      if (typeof pack.onboardingComplete === "boolean") {
        setOnboardingComplete(pack.onboardingComplete);
      }
      if (pack.publicRoster) {
        importRoster(pack.publicRoster);
      }
      if (pack.preferences) {
        setPreferences(pack.preferences);
      }
      if (pack.websiteDraft) {
        replaceDraft(pack.websiteDraft);
      }
      setTone("success");
      setMessage(t("importSuccess"));
    } catch {
      setTone("danger");
      setMessage(t("errorInvalidJson"));
    }
  };

  return (
    <PageShell className="py-6 md:py-8 lg:py-10">
      <header className="max-w-2xl">
        <h1 className="text-2xl font-bold text-opseu-dark md:text-3xl">
          {t("title")}
        </h1>
        <p className="mt-1 max-w-prose text-gray-600">{t("subtitle")}</p>
        <p className="mt-2 max-w-2xl text-sm text-gray-500">{t("whenToUse")}</p>
      </header>

      <div className="mt-6 max-w-2xl space-y-4">
        <Callout tone="muted">
          <p>{t("includesIntro")}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>{t("includesBrandKit")}</li>
            <li>{t("includesRoster")}</li>
            <li>{t("includesPreferences")}</li>
            <li>{t("includesWebsiteDraft")}</li>
          </ul>
          <p className="mt-2 text-sm">{t("excludesNote")}</p>
        </Callout>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={handleExport} disabled={exporting}>
            {exporting ? tc("loading") : t("exportPack")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={exporting}
          >
            {t("importPack")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleExportRosterCsv}
          >
            {t("exportRosterCsv")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label={t("importPack")}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void handleImport(file);
            }}
          />
        </div>

        {exportError ? (
          <p className="text-sm text-red-700" role="alert">
            {exportError}
          </p>
        ) : null}
        {exportSuccess ? (
          <p className="text-sm text-green-800" role="status">
            {t("exportSuccess")}
          </p>
        ) : null}
        {message ? (
          <p
            className={
              tone === "danger" ? "text-sm text-red-700" : "text-sm text-green-800"
            }
            role={tone === "danger" ? "alert" : "status"}
          >
            {message}
          </p>
        ) : null}

        <Callout tone="brand">
          <p className="font-semibold text-opseu-dark">{t("editElsewhere")}</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <li>
              <Link
                href="/brand-kit"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("linkBrandKit")}
              </Link>
            </li>
            <li>
              <Link
                href="/tools/org-chart"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("linkOrgChart")}
              </Link>
            </li>
            <li>
              <Link
                href="/tools/website-template"
                className="font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("linkWebsite")}
              </Link>
            </li>
          </ul>
        </Callout>
      </div>

      <div className="mt-10">
        <ToolRelatedFooter toolSlug="local-pack" />
      </div>
    </PageShell>
  );
}
