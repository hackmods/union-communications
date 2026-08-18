"use client";

import { useMemo, useState } from "react";
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
  joinWithConjunction,
  toWebsiteNavLinks,
  websiteCollectionLabels,
  websiteDisplayName,
} from "@/lib/templates/website/brand-kit-fields";
import {
  DEFAULT_WEBSITE_OFFICERS,
  type WebsiteOfficer,
  type WebsiteTemplateData,
} from "@/types/website-template";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { ToolEditorLayout } from "@/components/tools/ToolEditorLayout";
import { ToolRelatedFooter } from "@/components/tools/ToolRelatedFooter";
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

const LOGO_FILE_NAME = "logo.png";

export default function WebsiteTemplatePage() {
  const t = useTranslations("websiteTemplate");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const onboardingComplete = useBrandStore((s) => s.onboardingComplete);
  const localNumber = resolveLocalNumber(brandKit.local.localNumber);
  const { exportError, exportSuccess, exporting, runExport } =
    useExportHandler();

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
      : hydrated
        ? (brandKit.facebookUrl?.trim() ?? "")
        : "";
  const [officeAddress, setOfficeAddress] = useState(
    "North Pole, Arctic Circle\n1 Santa Claus Lane\nH0H 0H0, Canada",
  );
  const [officers, setOfficers] = useState<WebsiteOfficer[]>(
    DEFAULT_WEBSITE_OFFICERS,
  );
  const logoPreviewSrc = resolveBrandLogoSrc(brandKit);
  const includeOpseuResources = brandKit.unionPresetId === "opseu";
  const canvasTokens = resolveCanvasTokens(brandKit);
  const themeEstablished = isBrandThemeEstablished(
    brandKit,
    onboardingComplete,
  );
  const inDemo = useWorkshopDemoSession(null);
  const customLinks = useMemo(
    () => toWebsiteNavLinks(brandKit.customLinks ?? []),
    [brandKit.customLinks],
  );
  const membershipLinks = useMemo(
    () => toWebsiteNavLinks(listMembershipDestinations(brandKit)),
    [brandKit],
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
  });

  const templateData: WebsiteTemplateData = useMemo(
    () => ({
      localNumber,
      unionName,
      heroText,
      about1,
      about2,
      contactEmail,
      facebookUrl,
      customLinks,
      membershipLinks,
      officeAddress,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      officers,
      logoFileName: LOGO_FILE_NAME,
      logoPreviewSrc,
      logoAlt: unionName,
      includeOpseuResources,
      canvas: brandKit.canvas
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
      localNumber,
      unionName,
      heroText,
      about1,
      about2,
      contactEmail,
      facebookUrl,
      customLinks,
      membershipLinks,
      officeAddress,
      brandKit.primaryColor,
      brandKit.secondaryColor,
      brandKit.canvas,
      canvasTokens.surface,
      canvasTokens.typeScale,
      canvasTokens.density,
      canvasTokens.headlineFontId,
      canvasTokens.bodyFontId,
      officers,
      logoPreviewSrc,
      includeOpseuResources,
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
    if (officers.length >= 12) return;
    setOfficers((prev) => [...prev, { name: "", role: "", location: "" }]);
  };

  const removeOfficer = (index: number) => {
    if (officers.length <= 1) return;
    setOfficers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDownload = () => {
    void runExport(async () => {
      const { generateWebsiteZip } = await import(
        "@/lib/templates/website/generate-website-zip"
      );
      const { saveAs } = await import("file-saver");
      const logo = await resolveBrandLogoBytes(brandKit, { includeLogo: true });
      const blob = await generateWebsiteZip(
        templateData,
        logo ? { fileName: LOGO_FILE_NAME, bytes: logo.bytes } : null,
      );
      saveAs(blob, `local-${localNumber}-website.zip`);
    });
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
            {officers.length < 12 && (
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
          <Button onClick={handleDownload} disabled={exporting}>
            {exporting ? tc("loading") : t("downloadZip")}
          </Button>
        </Card>
      }
      previewActions={
        <Button onClick={handleDownload} disabled={exporting}>
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
