"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useBrandStore } from "@/store/brand-store";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { resolveLocalNumber } from "@/lib/utils";
import {
  buildPreviewHtml,
  generateWebsiteZip,
} from "@/lib/templates/website/generate-website-zip";
import {
  DEFAULT_WEBSITE_OFFICERS,
  type WebsiteOfficer,
  type WebsiteTemplateData,
} from "@/types/website-template";
import { saveAs } from "file-saver";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { PageShell } from "@/components/layout/PageShell";

export default function WebsiteTemplatePage() {
  const t = useTranslations("websiteTemplate");
  const tc = useTranslations("common");
  const ts = useTranslations("sources");
  const brandKit = useBrandStore((s) => s.brandKit);
  const hydrated = useBrandStore((s) => s.hydrated);
  const localNumber = resolveLocalNumber(brandKit.local.localNumber);

  const [unionName, setUnionName] = useState(`Local ${localNumber}`);
  const [heroText, setHeroText] = useState(
    "Members stand united in solidarity for fairness, respect, and quality public services. Get the latest updates and find out how to connect with your Local.",
  );
  const [about1, setAbout1] = useState(
    `Local ${localNumber} represents full-time and part-time members. We are dedicated to protecting our members' rights, ensuring fair and safe working conditions, and strengthening our community.`,
  );
  const [about2, setAbout2] = useState(
    "Through collective action and solidarity, we work to ensure the essential work our members perform is recognized and respected.",
  );
  const [contactEmail, setContactEmail] = useState(`local${localNumber}@example.com`);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [facebookSeeded, setFacebookSeeded] = useState(false);
  const [officeAddress, setOfficeAddress] = useState(
    "North Pole, Arctic Circle\n1 Santa Claus Lane\nH0H 0H0, Canada",
  );
  const [officers, setOfficers] = useState<WebsiteOfficer[]>(DEFAULT_WEBSITE_OFFICERS);
  const [downloading, setDownloading] = useState(false);

  // One-shot prefill after brand kit hydrates (adjust state during render).
  if (hydrated && !facebookSeeded) {
    setFacebookSeeded(true);
    const fromBrand = brandKit.facebookUrl?.trim();
    if (fromBrand) {
      setFacebookUrl(fromBrand);
    }
  }

  const templateData: WebsiteTemplateData = useMemo(
    () => ({
      localNumber,
      unionName,
      heroText,
      about1,
      about2,
      contactEmail,
      facebookUrl,
      officeAddress,
      primaryColor: brandKit.primaryColor,
      secondaryColor: brandKit.secondaryColor,
      officers,
    }),
    [
      localNumber,
      unionName,
      heroText,
      about1,
      about2,
      contactEmail,
      facebookUrl,
      officeAddress,
      brandKit.primaryColor,
      brandKit.secondaryColor,
      officers,
    ],
  );

  const previewHtml = useMemo(
    () => buildPreviewHtml(templateData),
    [templateData],
  );

  const updateOfficer = (index: number, field: keyof WebsiteOfficer, value: string) => {
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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await generateWebsiteZip(templateData);
      saveAs(blob, `local-${localNumber}-website.zip`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PageShell className="py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-gray-600">{t("subtitle")}</p>
      <p className="mt-3 rounded-md border border-opseu-blue/20 bg-opseu-blue/5 px-4 py-3 text-sm text-gray-700">
        {t("referenceNote")}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Card className="space-y-4">
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
            onChange={(e) => setFacebookUrl(e.target.value)}
          />
          <Textarea
            label={t("officeAddress")}
            value={officeAddress}
            onChange={(e) => setOfficeAddress(e.target.value)}
            rows={2}
          />

          <div>
            <p className="mb-2 text-sm font-medium">{t("officers")}</p>
            <div className="space-y-3">
              {officers.map((officer, index) => (
                <div key={index} className="rounded-md border border-gray-200 p-3">
                  <Input
                    label={t("officerName")}
                    value={officer.name}
                    onChange={(e) => updateOfficer(index, "name", e.target.value)}
                  />
                  <Input
                    label={t("officerRole")}
                    value={officer.role}
                    onChange={(e) => updateOfficer(index, "role", e.target.value)}
                  />
                  <Input
                    label={t("officerLocation")}
                    value={officer.location}
                    onChange={(e) => updateOfficer(index, "location", e.target.value)}
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
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addOfficer}>
                {t("addOfficer")}
              </Button>
            )}
          </div>

          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? tc("loading") : t("downloadZip")}
          </Button>
        </Card>

        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">{t("preview")}</p>
          <iframe
            title={t("preview")}
            srcDoc={previewHtml}
            className="h-[600px] w-full rounded-lg border border-gray-200 bg-white shadow-lg"
            sandbox="allow-scripts"
          />
        </div>
      </div>

      <SourcesBlock pageId="websiteTemplate" title={ts("title")} intro={ts("intro")} />
    </PageShell>
  );
}
