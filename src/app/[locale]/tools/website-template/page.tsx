"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { resolveLocalNumber } from "@/lib/utils";
import {
  resolveBrandLogoBytes,
  resolveBrandLogoSrc,
} from "@/lib/export/brand-logo-bytes";
import { buildPreviewHtml } from "@/lib/templates/website/generate-website-zip";
import {
  DEFAULT_WEBSITE_HERO_ART_ID,
  isWebsiteHeroArtId,
  websiteHeroDataUrlToBytes,
  websiteHeroUploadFileName,
  type WebsiteHeroArtId,
} from "@/lib/templates/website/hero-art";
import {
  joinWithConjunction,
  toWebsiteNavLinks,
  websiteCollectionLabels,
  websiteDisplayName,
} from "@/lib/templates/website/brand-kit-fields";
import {
  isWebsiteHeroPhotoFileName,
  type WebsiteConfigData,
  type WebsiteImportedAsset,
} from "@/lib/templates/website/website-config";
import {
  DEFAULT_WEBSITE_OFFICERS,
  type WebsiteOfficer,
  type WebsiteTemplateData,
} from "@/types/website-template";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
import { ImageUpload } from "@/components/tools/ImageUpload";
import { SegControl } from "@/components/tools/SegControl";
import { WorkshopDemoPath } from "@/components/comms/WorkshopDemoPath";
import { useWorkshopDemoSession } from "@/hooks/use-workshop-demo-session";
import { WebsitePreviewFrame } from "@/components/tools/WebsitePreviewFrame";
import { Callout } from "@/components/ui/Callout";
import { useExportHandler } from "@/hooks/use-export-handler";
import { useOneShotBrandSeed } from "@/hooks/use-one-shot-brand-seed";
import { resolveCanvasTokens } from "@/lib/utils/canvas-tokens";
import { isBrandThemeEstablished } from "@/lib/utils/brand-theme";
import { brandSetupHref } from "@/lib/utils/brand-setup";
import { listMembershipDestinations } from "@/lib/utils/local-links";
import { Link } from "@/i18n/navigation";
import { usePublicRosterStore } from "@/store/public-roster-store";
import { officersFromRoster } from "@/lib/org-chart/website";
import { MAX_WEBSITE_OFFICERS } from "@/types/public-roster";

const LOGO_FILE_NAME = "logo.png";

export default function WebsiteTemplatePage() {
  const t = useTranslations("websiteTemplate");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const rosterHydrated = usePublicRosterStore((s) => s.hydrated);
  const roster = usePublicRosterStore((s) => s.roster);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const localNumber = resolveLocalNumber(brandKit.local.localNumber);
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

  const [unionName, setUnionName] = useState(`Local ${localNumber}`);
  const [heroText, setHeroText] = useState(t("heroDefault"));
  const [about1, setAbout1] = useState(
    t("aboutSeedGeneric", { localNumber }),
  );
  const [about2, setAbout2] = useState(t("about2Default"));
  const [contactEmail, setContactEmail] = useState(
    `local${localNumber}@example.com`,
  );
  /** null = follow Brand Kit once hydrated; string = user/local draft */
  const [facebookDraft, setFacebookDraft] = useState<string | null>(null);
  const facebookUrl =
    facebookDraft !== null
      ? facebookDraft
      : overlay
        ? overlay.facebookUrl
        : hydrated
          ? (brandKit.facebookUrl?.trim() ?? "")
          : "";
  const [officeAddress, setOfficeAddress] = useState(
    "North Pole, Arctic Circle\n1 Santa Claus Lane\nH0H 0H0, Canada",
  );
  const [officers, setOfficers] = useState<WebsiteOfficer[]>(
    DEFAULT_WEBSITE_OFFICERS,
  );
  const [heroArtId, setHeroArtId] = useState<WebsiteHeroArtId>(
    DEFAULT_WEBSITE_HERO_ART_ID,
  );
  const [heroImagePreviewSrc, setHeroImagePreviewSrc] = useState("");
  const [heroImageAlt, setHeroImageAlt] = useState("");
  const displayLocalNumber = overlay?.localNumber
    ? resolveLocalNumber(overlay.localNumber)
    : localNumber;
  const logoPreviewSrc =
    importedLogo?.previewSrc ?? resolveBrandLogoSrc(brandKit);
  const includeOpseuResources = overlay
    ? overlay.includeOpseuResources
    : brandKit.unionPresetId === "opseu";
  const canvasTokens = resolveCanvasTokens(brandKit);
  const busy = exporting || importing;
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );
  const inDemo = useWorkshopDemoSession(null);
  const customLinks = useMemo(
    () =>
      overlay
        ? overlay.customLinks
        : toWebsiteNavLinks(brandKit.customLinks ?? []),
    [overlay, brandKit.customLinks],
  );
  const membershipLinks = useMemo(
    () =>
      overlay
        ? overlay.membershipLinks
        : toWebsiteNavLinks(listMembershipDestinations(brandKit)),
    [overlay, brandKit],
  );

  useOneShotBrandSeed(hydrated, () => {
    const number = resolveLocalNumber(brandKit.local.localNumber);
    setUnionName(websiteDisplayName(brandKit, number));
    setContactEmail(`local${number}@example.com`);
    const collections = websiteCollectionLabels(brandKit);
    setAbout1(
      collections.length > 0
        ? t("aboutSeedNamed", {
            localNumber: number,
            collections: joinWithConjunction(collections, t("listAnd")),
          })
        : t("aboutSeedGeneric", { localNumber: number }),
    );
  }, overlay === null);

  const applyRosterOfficers = () => {
    const next = officersFromRoster(roster);
    if (next.length) setOfficers(next);
  };

  useOneShotBrandSeed(rosterHydrated, applyRosterOfficers, overlay === null);

  const templateData: WebsiteTemplateData = useMemo(
    () => ({
      localNumber: displayLocalNumber,
      unionName,
      heroText,
      about1,
      about2,
      contactEmail,
      facebookUrl,
      customLinks,
      membershipLinks,
      officeAddress,
      primaryColor: overlay?.primaryColor ?? brandKit.primaryColor,
      secondaryColor: overlay?.secondaryColor ?? brandKit.secondaryColor,
      officers,
      logoFileName: importedLogo?.fileName ?? LOGO_FILE_NAME,
      logoPreviewSrc,
      logoAlt: overlay?.logoAlt || unionName,
      includeOpseuResources,
      heroArtId,
      heroImageFileName: heroImagePreviewSrc
        ? importedHero?.fileName ?? websiteHeroUploadFileName(heroImagePreviewSrc)
        : undefined,
      heroImagePreviewSrc,
      heroImageAlt,
      canvas: overlay?.canvas
        ? overlay.canvas
        : brandKit.canvas
          ? {
              surface: canvasTokens.surface,
              typeScale: canvasTokens.typeScale,
              density: canvasTokens.density,
              headlineFontId: canvasTokens.headlineFontId,
              bodyFontId: canvasTokens.bodyFontId,
            }
          : {
              headlineFontId: canvasTokens.headlineFontId,
              bodyFontId: canvasTokens.bodyFontId,
            },
    }),
    [
      displayLocalNumber,
      unionName,
      heroText,
      about1,
      about2,
      contactEmail,
      facebookUrl,
      customLinks,
      membershipLinks,
      officeAddress,
      overlay,
      brandKit.primaryColor,
      brandKit.secondaryColor,
      brandKit.canvas,
      canvasTokens.surface,
      canvasTokens.typeScale,
      canvasTokens.density,
      canvasTokens.headlineFontId,
      canvasTokens.bodyFontId,
      officers,
      importedLogo,
      importedHero,
      logoPreviewSrc,
      includeOpseuResources,
      heroArtId,
      heroImagePreviewSrc,
      heroImageAlt,
    ],
  );

  const previewHtml = useMemo(
    () => buildPreviewHtml(templateData),
    [templateData],
  );

  const updateOfficer = (
    index: number,
    field: keyof WebsiteOfficer,
    value: string,
  ) => {
    setOfficers((prev) =>
      prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)),
    );
  };

  const addOfficer = () => {
    if (officers.length >= MAX_WEBSITE_OFFICERS) return;
    setOfficers((prev) => [...prev, { name: "", role: "", location: "" }]);
  };

  const removeOfficer = (index: number) => {
    if (officers.length <= 1) return;
    setOfficers((prev) => prev.filter((_, i) => i !== index));
  };

  const collectExportMedia = async () => {
    let logo: { fileName: string; bytes: Uint8Array } | null = null;
    if (importedLogo) {
      logo = { fileName: importedLogo.fileName, bytes: importedLogo.bytes };
    } else {
      const resolved = await resolveBrandLogoBytes(brandKit, {
        includeLogo: true,
      });
      logo = resolved ? { fileName: LOGO_FILE_NAME, bytes: resolved.bytes } : null;
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
    setUnionName(data.unionName);
    setHeroText(data.heroText);
    setAbout1(data.about1);
    setAbout2(data.about2);
    setContactEmail(data.contactEmail);
    setFacebookDraft(data.facebookUrl);
    setOfficeAddress(data.officeAddress);
    setOfficers(data.officers);
    setHeroArtId(
      data.heroArtId && isWebsiteHeroArtId(data.heroArtId)
        ? data.heroArtId
        : "none",
    );
    setImportedLogo(imported.logo ?? null);
    if (imported.heroImage) {
      setImportedHero(imported.heroImage);
      setHeroImagePreviewSrc(imported.heroImage.previewSrc);
      setHeroImageAlt(data.heroImageAlt ?? "");
      setImportPhotoMissing(false);
    } else {
      setImportedHero(null);
      setHeroImagePreviewSrc("");
      setHeroImageAlt(data.heroImageAlt ?? "");
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
      toolbar={<Callout tone="brand">{t("referenceNote")}</Callout>}
      form={
        <Card density="compact" className="space-y-3">
          <Input
            label={t("unionName")}
            value={unionName}
            onChange={(e) => setUnionName(e.target.value)}
          />
          <Textarea
            label={t("heroText")}
            value={heroText}
            onChange={(e) => setHeroText(e.target.value)}
            rows={2}
          />
          <SegControl
            label={t("heroArt")}
            value={heroArtId}
            onChange={(value) => {
              if (isWebsiteHeroArtId(value)) setHeroArtId(value);
            }}
            options={[
              { value: "none", label: t("heroArtNone") },
              { value: "bands", label: t("heroArtBands") },
              { value: "mesh", label: t("heroArtMesh") },
              { value: "horizon", label: t("heroArtHorizon") },
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
              setHeroImageAlt("");
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
              onChange={(e) => setHeroImageAlt(e.target.value)}
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
          <Textarea
            label={t("about1")}
            value={about1}
            onChange={(e) => setAbout1(e.target.value)}
            rows={3}
          />
          <Textarea
            label={t("about2")}
            value={about2}
            onChange={(e) => setAbout2(e.target.value)}
            rows={2}
          />
          <Input
            label={t("contactEmail")}
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Input
            label={t("facebookUrl")}
            value={facebookUrl}
            onChange={(e) => setFacebookDraft(e.target.value)}
          />
          <Textarea
            label={t("officeAddress")}
            value={officeAddress}
            onChange={(e) => setOfficeAddress(e.target.value)}
            rows={2}
          />

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

          <div>
            <p className="mb-2 text-sm font-medium">{t("officers")}</p>
            <p className="mb-2 text-sm text-gray-600">{t("orgChartHint")}</p>
            <div className="mb-3 flex flex-wrap gap-2">
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
                className="mt-2"
                onClick={addOfficer}
              >
                {t("addOfficer")}
              </Button>
            )}
          </div>

          {exportError ? (
            <p className="text-sm text-red-700" role="alert">
              {exportError}
            </p>
          ) : null}
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
          <Button onClick={handleDownload} disabled={busy}>
            {exporting ? tc("loading") : t("downloadZip")}
          </Button>
          <Callout tone="muted">
            <p className="font-semibold text-opseu-dark">
              {t("wordpressHeading")}
            </p>
            <p className="mt-1">{t("wordpressUnsupported")}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={handleWordpressDownload}
              disabled={busy}
            >
              {exporting ? tc("loading") : t("downloadWordpress")}
            </Button>
          </Callout>
          <Callout tone="muted">
            <p>{t("squarespaceNote")}</p>
          </Callout>
        </Card>
      }
      previewActions={
        <>
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
          <Button onClick={handleDownload} disabled={busy}>
            {exporting ? tc("loading") : t("downloadZip")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleWordpressDownload}
            disabled={busy}
          >
            {exporting ? tc("loading") : t("downloadWordpress")}
          </Button>
        </>
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
