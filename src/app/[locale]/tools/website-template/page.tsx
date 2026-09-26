"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { resolveLocalNumber } from "@/lib/utils";
import {
  resolveBrandLogoBytes,
  resolveBrandLogoSrc,
} from "@/lib/export/brand-logo-bytes";
import { buildPreviewHtml } from "@/lib/templates/website/generate-website-zip";
import {
  coerceWebsiteHeroArtId,
  isWebsiteHeroArtId,
  websiteHeroDataUrlToBytes,
  websiteHeroUploadFileName,
  type WebsiteHeroArtId,
} from "@/lib/templates/website/hero-art";
import {
  joinWithConjunction,
  websiteCollectionLabels,
  websiteDisplayName,
} from "@/lib/templates/website/brand-kit-fields";
import {
  isWebsiteHeroPhotoFileName,
  type WebsiteConfigData,
  type WebsiteImportedAsset,
} from "@/lib/templates/website/website-config";
import {
  composeWebsiteTemplateData,
  WEBSITE_COMPOSE_LOGO_FILE_NAME,
} from "@/lib/templates/website/compose-website-data";
import type { WebsiteOfficer } from "@/types/website-template";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { SegControl } from "@/components/tools/SegControl";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import { WebsitePreviewFrame } from "@/components/tools/WebsitePreviewFrame";
import { BrandSetupPrompt } from "@/components/tools/BrandSetupPrompt";
import { Callout } from "@/components/ui/Callout";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { brandSetupHref } from "@/lib/utils/brand-setup";
import { Link } from "@/i18n/navigation";
import { usePublicRosterStore } from "@/store/public-roster-store";
import { useWebsiteDraftStore } from "@/store/website-draft-store";
import { officersFromRoster } from "@/lib/org-chart/website";
import { MAX_WEBSITE_OFFICERS } from "@/types/public-roster";

export default function WebsiteTemplatePage() {
  const t = useTranslations("websiteTemplate");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const rosterHydrated = usePublicRosterStore((s) => s.hydrated);
  const roster = usePublicRosterStore((s) => s.roster);
  const draft = useWebsiteDraftStore((s) => s.draft);
  const draftHydrated = useWebsiteDraftStore((s) => s.hydrated);
  const setDraft = useWebsiteDraftStore((s) => s.setDraft);
  const replaceDraft = useWebsiteDraftStore((s) => s.replaceDraft);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();
  const fileRef = useRef<HTMLInputElement>(null);
  const [overlay, setOverlay] = useState<WebsiteConfigData | null>(null);
  const [importedLogo, setImportedLogo] = useState<WebsiteImportedAsset | null>(
    null,
  );
  const [importedHero, setImportedHero] = useState<WebsiteImportedAsset | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPhotoMissing, setImportPhotoMissing] = useState(false);
  /** Session-only hero photo (not persisted in Local pack / draft). */
  const [heroImagePreviewSrc, setHeroImagePreviewSrc] = useState("");

  const logoPreviewSrc =
    importedLogo?.previewSrc ?? resolveBrandLogoSrc(brandKit);
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );
  const inDemo = useWorkshopDemoSession(null);
  const busy = exporting || importing;

  const draftLooksEmpty =
    !draft.unionName.trim() &&
    !draft.heroText.trim() &&
    !draft.about1.trim() &&
    !draft.contactEmail.trim();

  useOneShotBrandSeed(
    hydrated && draftHydrated,
    () => {
      const number = resolveLocalNumber(brandKit.local.localNumber);
      const collections = websiteCollectionLabels(brandKit);
      setDraft({
        unionName: websiteDisplayName(brandKit, number),
        contactEmail: `local${number}@example.com`,
        about1:
          collections.length > 0
            ? t("aboutSeedNamed", {
                localNumber: number,
                collections: joinWithConjunction(collections, t("listAnd")),
              })
            : t("aboutSeedGeneric", { localNumber: number }),
        heroText: draft.heroText || t("heroDefault"),
        about2: draft.about2 || t("about2Default"),
      });
    },
    overlay === null && draftLooksEmpty,
  );

  useOneShotBrandSeed(
    rosterHydrated && draftHydrated,
    () => {
      if (draft.officersOverride) return;
      const next = officersFromRoster(roster);
      if (next.length) {
        setDraft({ officers: next, officersOverride: false });
      }
    },
    overlay === null && !draft.officersOverride && draft.officers.length === 0,
  );

  const templateData = useMemo(
    () =>
      composeWebsiteTemplateData({
        brandKit,
        roster,
        draft,
        overlay,
        logoPreviewSrc,
        logoFileName: importedLogo?.fileName ?? WEBSITE_COMPOSE_LOGO_FILE_NAME,
        logoAlt: overlay?.logoAlt,
        heroImagePreviewSrc,
        heroImageFileName: heroImagePreviewSrc
          ? importedHero?.fileName ??
            websiteHeroUploadFileName(heroImagePreviewSrc)
          : undefined,
      }),
    [
      brandKit,
      roster,
      draft,
      overlay,
      logoPreviewSrc,
      importedLogo,
      importedHero,
      heroImagePreviewSrc,
    ],
  );

  const displayLocalNumber = templateData.localNumber;
  const customLinks = templateData.customLinks ?? [];
  const membershipLinks = templateData.membershipLinks ?? [];
  const officers = templateData.officers;
  const facebookUrl = templateData.facebookUrl;
  const heroArtId = templateData.heroArtId ?? "mesh";
  const heroImageAlt = templateData.heroImageAlt ?? "";

  const previewHtml = useMemo(
    () => buildPreviewHtml(templateData),
    [templateData],
  );

  const applyRosterOfficers = () => {
    const next = officersFromRoster(roster);
    if (next.length) {
      setDraft({ officers: next, officersOverride: false });
      setOverlay(null);
    }
  };

  const updateOfficer = (
    index: number,
    field: keyof WebsiteOfficer,
    value: string,
  ) => {
    const next = officers.map((o, i) =>
      i === index ? { ...o, [field]: value } : o,
    );
    setDraft({ officers: next, officersOverride: true });
    setOverlay(null);
  };

  const addOfficer = () => {
    if (officers.length >= MAX_WEBSITE_OFFICERS) return;
    setDraft({
      officers: [...officers, { name: "", role: "", location: "" }],
      officersOverride: true,
    });
    setOverlay(null);
  };

  const removeOfficer = (index: number) => {
    if (officers.length <= 1) return;
    setDraft({
      officers: officers.filter((_, i) => i !== index),
      officersOverride: true,
    });
    setOverlay(null);
  };

  const patchCopy = (
    partial: Partial<{
      unionName: string;
      heroText: string;
      about1: string;
      about2: string;
      contactEmail: string;
      officeAddress: string;
      facebookUrl: string | null;
      heroArtId: WebsiteHeroArtId;
      heroImageAlt: string;
    }>,
  ) => {
    setDraft(partial);
    setOverlay(null);
  };

  const collectExportMedia = async () => {
    let logo: { fileName: string; bytes: Uint8Array } | null = null;
    if (importedLogo) {
      logo = { fileName: importedLogo.fileName, bytes: importedLogo.bytes };
    } else {
      const resolved = await resolveBrandLogoBytes(brandKit, {
        includeLogo: true,
      });
      logo = resolved
        ? { fileName: WEBSITE_COMPOSE_LOGO_FILE_NAME, bytes: resolved.bytes }
        : null;
    }
    let heroImage: { fileName: string; bytes: Uint8Array } | null = null;
    if (heroImagePreviewSrc.trim()) {
      if (importedHero && importedHero.previewSrc === heroImagePreviewSrc) {
        heroImage = {
          fileName: importedHero.fileName,
          bytes: importedHero.bytes,
        };
      } else {
        const bytes = websiteHeroDataUrlToBytes(heroImagePreviewSrc);
        if (!bytes) {
          throw new Error(tc("uploadFailed"));
        }
        heroImage = {
          fileName: websiteHeroUploadFileName(heroImagePreviewSrc),
          bytes,
        };
      }
    }
    return { logo, heroImage };
  };

  const handleDownload = () => {
    void runExport(async () => {
      const { generateWebsiteZip } = await import(
        "@/lib/templates/website/generate-website-zip"
      );
      const { saveAs } = await import("file-saver");
      const { logo, heroImage } = await collectExportMedia();
      const blob = await generateWebsiteZip(templateData, logo, heroImage);
      saveAs(blob, `local-${displayLocalNumber}-website.zip`);
    });
  };

  const handleWordpressDownload = () => {
    void runExport(async () => {
      const { generateWordpressThemeZip } = await import(
        "@/lib/templates/website/generate-wordpress-theme-zip"
      );
      const { saveAs } = await import("file-saver");
      const { logo, heroImage } = await collectExportMedia();
      const blob = await generateWordpressThemeZip(
        templateData,
        logo,
        heroImage,
      );
      saveAs(blob, `local-${displayLocalNumber}-wordpress-theme.zip`);
    });
  };

  const handleDownloadConfig = () => {
    void runExport(async () => {
      const { buildWebsiteConfigJson } = await import(
        "@/lib/templates/website/website-config"
      );
      const { saveAs } = await import("file-saver");
      const blob = new Blob([buildWebsiteConfigJson(templateData)], {
        type: "application/json",
      });
      saveAs(blob, `local-${displayLocalNumber}-website.json`);
    });
  };

  const applyImportedSite = (imported: {
    envelope: { data: WebsiteConfigData };
    logo?: WebsiteImportedAsset;
    heroImage?: WebsiteImportedAsset;
  }) => {
    const data = imported.envelope.data;
    setOverlay(data);
    replaceDraft({
      version: 1,
      updatedAt: new Date().toISOString(),
      unionName: data.unionName,
      heroText: data.heroText,
      about1: data.about1,
      about2: data.about2,
      contactEmail: data.contactEmail,
      officeAddress: data.officeAddress,
      facebookUrl: data.facebookUrl,
      officersOverride: true,
      officers: data.officers,
      heroArtId: coerceWebsiteHeroArtId(data.heroArtId) ?? "none",
      heroImageAlt: data.heroImageAlt ?? "",
    });
    setImportedLogo(imported.logo ?? null);
    if (imported.heroImage) {
      setImportedHero(imported.heroImage);
      setHeroImagePreviewSrc(imported.heroImage.previewSrc);
      setImportPhotoMissing(false);
    } else {
      setImportedHero(null);
      setHeroImagePreviewSrc("");
      setImportPhotoMissing(
        Boolean(
          data.heroImageFileName &&
            isWebsiteHeroPhotoFileName(data.heroImageFileName),
        ),
      );
    }
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError(null);
    setImportMessage(null);
    setImportPhotoMissing(false);
    setImporting(true);
    void (async () => {
      try {
        const { parseWebsiteConfigFile } = await import(
          "@/lib/templates/website/website-config"
        );
        const imported = await parseWebsiteConfigFile(file);
        applyImportedSite(imported);
        setImportMessage(t("importSuccess"));
      } catch {
        setImportError(t("importError"));
      } finally {
        setImporting(false);
      }
    })();
  };

  const bundledCount = customLinks.length + membershipLinks.length;

  return (
    <ToolEditorLayout
      title={t("title")}
      eyebrow={inDemo ? <WorkshopDemoPath variant="trail" /> : undefined}
      description={t("subtitle")}
      purposeHint={inDemo ? undefined : t("whenToUse")}
      previewAccessibleName={t("previewAccessibleName")}
      exportError={exportError}
      exportSuccess={exportSuccess}
      toolbar={
        <div className="space-y-3">
          {!themeEstablished ? (
            <BrandSetupPrompt themeEstablished={themeEstablished} />
          ) : null}
          <Callout tone="brand">{t("referenceNote")}</Callout>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownload} disabled={busy}>
              {exporting ? tc("loading") : t("downloadZip")}
            </Button>
            <Button
              type="button"
              onClick={handleWordpressDownload}
              disabled={busy}
            >
              {exporting ? tc("loading") : t("downloadWordpress")}
            </Button>
          </div>
          <p className="text-sm text-gray-600">{t("wordpressUpdateHint")}</p>
        </div>
      }
      form={
        <div className="space-y-3">
          <Input
            label={t("unionName")}
            value={templateData.unionName}
            onChange={(e) => patchCopy({ unionName: e.target.value })}
          />

          <ToolFormDetails title={t("sectionHero")}>
            <Textarea
              label={t("heroText")}
              value={templateData.heroText}
              onChange={(e) => patchCopy({ heroText: e.target.value })}
              rows={2}
            />
            <SegControl
              label={t("heroArt")}
              value={heroArtId}
              onChange={(value) => {
                if (isWebsiteHeroArtId(value)) {
                  patchCopy({ heroArtId: value });
                }
              }}
              options={[
                { value: "none", label: t("heroArtNone") },
                { value: "mesh", label: t("heroArtMesh") },
                { value: "arc", label: t("heroArtArc") },
                { value: "bloom", label: t("heroArtBloom") },
              ]}
            />
            <p className="text-xs text-gray-500">{t("heroArtHint")}</p>
            <ImageUpload
              label={t("heroArtUpload")}
              hint={t("heroArtUploadHint")}
              preview={heroImagePreviewSrc}
              onUpload={(dataUrl) => {
                setImportedHero(null);
                setImportPhotoMissing(false);
                setHeroImagePreviewSrc(dataUrl);
              }}
              onClear={() => {
                setImportedHero(null);
                setImportPhotoMissing(false);
                setHeroImagePreviewSrc("");
                patchCopy({ heroImageAlt: "" });
              }}
            />
            <p className="text-sm leading-snug text-gray-600">
              <Link
                href="/guide/photo-consent"
                className="text-opseu-blue underline"
              >
                {t("photoConsentLink")}
              </Link>
            </p>
            {heroImagePreviewSrc ? (
              <Input
                label={t("heroArtAlt")}
                value={heroImageAlt}
                onChange={(e) => patchCopy({ heroImageAlt: e.target.value })}
                aria-describedby="website-hero-alt-hint"
              />
            ) : null}
            {heroImagePreviewSrc ? (
              <p id="website-hero-alt-hint" className="text-xs text-gray-500">
                {t("heroArtAltHint")}
              </p>
            ) : null}
            {importPhotoMissing ? (
              <p className="text-sm text-gray-700" role="status">
                {t("importPhotoMissing")}
              </p>
            ) : null}
          </ToolFormDetails>

          <ToolFormDetails title={t("sectionAbout")}>
            <Textarea
              label={t("about1")}
              value={templateData.about1}
              onChange={(e) => patchCopy({ about1: e.target.value })}
              rows={3}
            />
            <Textarea
              label={t("about2")}
              value={templateData.about2}
              onChange={(e) => patchCopy({ about2: e.target.value })}
              rows={2}
            />
          </ToolFormDetails>

          <ToolFormDetails title={t("sectionContact")}>
            <Input
              label={t("contactEmail")}
              type="email"
              value={templateData.contactEmail}
              onChange={(e) => patchCopy({ contactEmail: e.target.value })}
            />
            <Input
              label={t("facebookUrl")}
              value={facebookUrl}
              onChange={(e) => patchCopy({ facebookUrl: e.target.value })}
            />
            <Textarea
              label={t("officeAddress")}
              value={templateData.officeAddress}
              onChange={(e) => patchCopy({ officeAddress: e.target.value })}
              rows={2}
              placeholder={t("officeAddressPlaceholder")}
            />
          </ToolFormDetails>

          <ToolFormDetails title={t("bundledHeading")}>
            <Callout tone={bundledCount > 0 ? "muted" : "brand"}>
              <p className="font-semibold text-opseu-dark">
                {t("bundledHeading")}
              </p>
              <p className="mt-1">
                {bundledCount > 0 ? t("bundledIntro") : t("bundledEmpty")}
              </p>
              {customLinks.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    {t("bundledCustomHeading")}
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {customLinks.map((link) => (
                      <li key={link.url}>{link.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {membershipLinks.length > 0 ? (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    {t("bundledMembershipHeading")}
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    {membershipLinks.map((link) => (
                      <li key={link.url}>{link.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-3">
                <Link
                  href={brandSetupHref(themeEstablished)}
                  className="font-semibold text-opseu-blue underline underline-offset-2"
                >
                  {t("bundledEdit")}
                </Link>
              </p>
            </Callout>
          </ToolFormDetails>

          <ToolFormDetails title={t("sectionOfficers")}>
            <p className="text-sm text-gray-600">{t("orgChartHint")}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyRosterOfficers}
              >
                {t("useOrgChart")}
              </Button>
              <Link
                href="/tools/org-chart"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-opseu-blue underline underline-offset-2"
              >
                {t("orgChartLink")}
              </Link>
            </div>
            <div className="space-y-3">
              {officers.map((officer, index) => (
                <div
                  key={index}
                  className="rounded-md border border-gray-200 p-3"
                >
                  <Input
                    label={t("officerName")}
                    value={officer.name}
                    onChange={(e) =>
                      updateOfficer(index, "name", e.target.value)
                    }
                  />
                  <Input
                    label={t("officerRole")}
                    value={officer.role}
                    onChange={(e) =>
                      updateOfficer(index, "role", e.target.value)
                    }
                  />
                  <Input
                    label={t("officerLocation")}
                    value={officer.location}
                    onChange={(e) =>
                      updateOfficer(index, "location", e.target.value)
                    }
                  />
                  {officers.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => removeOfficer(index)}
                    >
                      {t("removeOfficer")}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {officers.length < MAX_WEBSITE_OFFICERS && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOfficer}
              >
                {t("addOfficer")}
              </Button>
            )}
          </ToolFormDetails>

          <ToolFormDetails title={t("sectionImportExport")}>
            {importError ? (
              <p className="text-sm text-red-700" role="alert">
                {importError}
              </p>
            ) : null}
            {importMessage ? (
              <p className="text-sm text-opseu-blue" role="status">
                {importMessage}
              </p>
            ) : null}
            <Callout tone="muted">
              <p>{t("importHint")}</p>
            </Callout>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.zip,application/json,application/zip"
              className="sr-only"
              aria-label={t("import")}
              onChange={handleImport}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                {importing ? tc("loading") : t("import")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadConfig}
                disabled={busy}
              >
                {exporting ? tc("loading") : t("downloadConfig")}
              </Button>
            </div>
          </ToolFormDetails>

          <ToolFormDetails title={t("sectionWordpress")}>
            <Callout tone="brand">
              <p className="font-semibold text-opseu-dark">
                {t("wordpressHeading")}
              </p>
              <p className="mt-1">{t("wordpressSupported")}</p>
              <p className="mt-2 text-sm">{t("wordpressUpdateHint")}</p>
            </Callout>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleWordpressDownload}
                disabled={busy}
              >
                {exporting ? tc("loading") : t("downloadWordpress")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadConfig}
                disabled={busy}
              >
                {exporting ? tc("loading") : t("downloadConfig")}
              </Button>
            </div>
          </ToolFormDetails>

          <ToolFormDetails title={t("sectionOtherPlatforms")}>
            <Callout tone="muted">
              <p>{t("squarespaceNote")}</p>
            </Callout>
          </ToolFormDetails>

          {exportError ? (
            <p className="text-sm text-red-700" role="alert">
              {exportError}
            </p>
          ) : null}
        </div>
      }
      previewActions={
        <Button onClick={handleDownload} disabled={busy}>
          {exporting ? tc("loading") : t("downloadZip")}
        </Button>
      }
      preview={
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">
            {t("preview")}
          </p>
          <WebsitePreviewFrame title={t("preview")} html={previewHtml} />
        </div>
      }
      footer={
        <div className="space-y-6">
          <SourcesBlock
            pageId="websiteTemplate"
            title={ts("title")}
            intro={ts("intro")}
          />
          <ToolRelatedFooter toolSlug="website-template" />
        </div>
      }
    />
  );
}
