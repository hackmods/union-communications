import { describe, expect, it } from "vitest";
import { buildWebsiteHtml, generateWebsiteZip } from "@/lib/templates/website/generate-website-zip";
import type { WebsiteTemplateData } from "@/types/website-template";
import { partitionWebsiteOfficers } from "@/lib/org-chart/website";

const base: WebsiteTemplateData = {
  localNumber: "7",
  unionName: "Local 7",
  heroText: "Solidarity forever.",
  about1: "About one.",
  about2: "About two.",
  contactEmail: "local7@example.com",
  facebookUrl: "",
  officeAddress: "",
  primaryColor: "#003DA5",
  secondaryColor: "#FFFFFF",
  accentColor: "#E87722",
  officers: [
    { name: "Pat", role: "President", location: "", group: "executive" },
    { name: "Sam", role: "Steward", location: "Floor", group: "stewards" },
    {
      name: "Alex",
      role: "Chair",
      location: "",
      group: "committee",
      committeeName: "Health & Safety",
    },
  ],
  logoFileName: "",
  logoPreviewSrc: "",
  logoAlt: "Local 7",
  includeOpseuResources: false,
  layoutId: "solidarity",
  siteLocale: "en",
  includePrivacyPage: true,
};

describe("website layout diversity", () => {
  it("partitions roster groups for section rendering", () => {
    const parts = partitionWebsiteOfficers(base.officers);
    expect(parts.executive.map((o) => o.name)).toEqual(["Pat"]);
    expect(parts.stewards.map((o) => o.name)).toEqual(["Sam"]);
    expect(parts.committees[0]?.committeeName).toBe("Health & Safety");
  });

  it("emits distinct body classes and stewards section per layout", () => {
    const solidarity = buildWebsiteHtml({ ...base, layoutId: "solidarity" });
    const bulletin = buildWebsiteHtml({ ...base, layoutId: "bulletin" });
    const hall = buildWebsiteHtml({ ...base, layoutId: "hall" });
    expect(solidarity).toContain('class="layout-solidarity"');
    expect(bulletin).toContain('class="layout-bulletin"');
    expect(hall).toContain('class="layout-hall"');
    expect(solidarity).toContain('id="stewards"');
    expect(solidarity).toContain('id="committees"');
    expect(solidarity).toContain("skip-link");
    expect(solidarity).toContain('property="og:title"');
  });

  it("localizes chrome for French site locale", () => {
    const html = buildWebsiteHtml({ ...base, siteLocale: "fr" });
    expect(html).toContain('lang="fr"');
    expect(html).toContain("Nous joindre");
    expect(html).toContain("Confidentialité");
  });

  it("bundles privacy.html in the ZIP", async () => {
    const blob = await generateWebsiteZip({
      ...base,
      canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
    });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files)).toContain("privacy.html");
    expect(Object.keys(zip.files)).toContain("unionops-website.json");
  });
});
