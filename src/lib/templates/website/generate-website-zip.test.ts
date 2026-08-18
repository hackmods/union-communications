import { describe, it, expect } from "vitest";
import {
  buildWebsiteHtml,
  buildWebsiteCss,
  buildPreviewHtml,
  generateWebsiteZip,
} from "@/lib/templates/website/generate-website-zip";
import { getOpseuWebsiteFooterSources } from "@/lib/constants/comms-sources";
import type { WebsiteTemplateData } from "@/types/website-template";

const sampleData: WebsiteTemplateData = {
  localNumber: "243",
  unionName: "OPSEU SEFPO Local 243",
  heroText: "Support staff united.",
  about1: "About paragraph one.",
  about2: "About paragraph two.",
  contactEmail: "local243@example.com",
  facebookUrl: "https://facebook.com/groups/example",
  officeAddress: "North Pole, Arctic Circle\n1 Santa Claus Lane\nH0H 0H0, Canada",
  primaryColor: "#003DA5",
  secondaryColor: "#FFFFFF",
  officers: [
    { name: "Jane Doe", role: "President", location: "WC-101" },
  ],
  logoFileName: "logo.png",
  logoPreviewSrc: "/assets/caat-opseu/logo-primary.png",
  logoAlt: "OPSEU SEFPO Local 243",
  includeOpseuResources: true,
};

describe("generate-website-zip", () => {
  it("includes Brand Kit logo and OPSEU resources when theme is OPSEU", () => {
    const html = buildWebsiteHtml(sampleData);
    expect(html).toContain('src="./assets/logo.png"');
    expect(html).toContain('alt="OPSEU SEFPO Local 243"');
    expect(html).not.toContain("opseu-header.svg");
    expect(html).toContain("OPSEU SEFPO Local 243");
    expect(html).toContain("Jane Doe");
    expect(html).toContain("mailto:local243@example.com");
    expect(html).toContain("Rights &amp; Partners");
    expect(html).toContain("Ontario Human Rights Code");
    expect(html).toContain("Union Resources");
    for (const source of getOpseuWebsiteFooterSources()) {
      expect(html).toContain(`href="${source.url}"`);
    }
    expect(html).not.toContain("12263");
    expect(html).toContain("North Pole, Arctic Circle");
  });

  it("bundles Brand Kit custom and membership links and skips unsafe hrefs", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      customLinks: [
        { label: "Instagram", url: "https://instagram.com/local243" },
        { label: "<script>x</script>", url: "https://example.com/ok" },
        { label: "Nope", url: "javascript:alert(1)" },
      ],
      membershipLinks: [
        { label: "Join full-time", url: "https://example.com/join-ft" },
      ],
    });
    expect(html).toContain("Instagram");
    expect(html).toContain("https://instagram.com/local243");
    expect(html).toContain("Join full-time");
    expect(html).toContain("https://example.com/join-ft");
    expect(html).toContain("<h3>Membership</h3>");
    expect(html).toContain("To apply or update your membership:");
    expect(html).not.toContain("javascript:");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
    expect(html).not.toContain("<script>x</script>");
  });

  it("omits the membership column when Brand Kit has no join links", () => {
    const html = buildWebsiteHtml(sampleData);
    expect(html).not.toContain("<h3>Membership</h3>");
    expect(html).not.toContain("To apply or update your membership:");
  });

  it("omits OPSEU resource links when theme is not OPSEU", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      unionName: "CUPE Local 123",
      logoAlt: "CUPE Local 123",
      includeOpseuResources: false,
    });
    expect(html).not.toContain("Union Resources");
    expect(html).not.toContain("opseu.org");
    expect(html).not.toContain("members.opseu.org");
    expect(html).toContain("Rights &amp; Partners");
    expect(html).toContain('src="./assets/logo.png"');
  });

  it("falls back to text brand when logo filename is empty", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      logoFileName: "",
      logoPreviewSrc: "",
    });
    expect(html).toContain('class="header-brand-text"');
    expect(html).not.toContain('class="header-logo"');
  });

  it("escapes HTML in user content", () => {
    const html = buildWebsiteHtml({
      ...sampleData,
      unionName: "<script>alert(1)</script>",
      logoAlt: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("applies brand colours to CSS", () => {
    const css = buildWebsiteCss("#003DA5", "#FFFFFF");
    expect(css).toContain("--color-primary: #003DA5");
    expect(css).toContain("--color-secondary: #FFFFFF");
    expect(css).toContain(".site-header {\n  background: var(--color-primary);");
    expect(css).toContain(".footer {\n  background: var(--color-primary);");
    expect(css).toContain('--font-headline: "Montserrat", sans-serif');
    expect(css).toContain('--font-body: "Source Sans 3", sans-serif');
    expect(css).toContain("@font-face");
    expect(css).toContain('font-family: "Montserrat"');
    expect(css).toContain("font-synthesis: none");
    expect(css).toContain("font-weight: 700");
  });

  it("scales hero and type from Brand Kit canvas knobs", () => {
    const css = buildWebsiteCss("#003DA5", "#C8102E", {
      surface: "soft-gradient",
      typeScale: "display",
      density: "tight",
    });
    expect(css).toContain("linear-gradient(160deg, #003DA5 0%, #C8102E 100%)");
    expect(css).toContain("--font-size-h1: 3.36rem");
    expect(css).toContain("--spacing-4: 1.32rem");
  });

  it("emits chosen faces and @font-face for webfont canvas ids", () => {
    const css = buildWebsiteCss("#003DA5", "#FFFFFF", {
      headlineFontId: "oswald",
      bodyFontId: "sourceSerif",
    });
    expect(css).toContain('--font-headline: "Oswald", sans-serif');
    expect(css).toContain('--font-body: "Source Serif 4", serif');
    expect(css).toContain('font-family: "Oswald"');
    expect(css).toContain('font-family: "Source Serif 4"');
    expect(css).toContain('url("/fonts/oswald/');
  });

  it("skips @font-face when both faces are system residual", () => {
    const css = buildWebsiteCss("#003DA5", "#FFFFFF", {
      headlineFontId: "systemSans",
      bodyFontId: "systemSerif",
    });
    expect(css).not.toContain("@font-face");
    expect(css).toContain("system-ui");
    expect(css).toContain("Georgia");
  });

  it("builds preview HTML with inline styles and logo preview src", () => {
    const preview = buildPreviewHtml(sampleData);
    expect(preview).toContain("<style>");
    expect(preview).not.toContain('href="./css/style.css"');
    expect(preview).toContain('src="/assets/caat-opseu/logo-primary.png"');
    expect(preview).not.toContain('src="./assets/logo.png"');
  });

  it("bundles subset woff2 + NOTICE for webfont Brand Kit faces", async () => {
    const blob = await generateWebsiteZip({
      ...sampleData,
      canvas: { headlineFontId: "oswald", bodyFontId: "sourceSans" },
    });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(blob);
    const names = Object.keys(zip.files);
    expect(names).toContain("assets/fonts/NOTICE.txt");
    expect(names.some((n) => n.includes("oswald") && n.endsWith(".woff2"))).toBe(
      true,
    );
    expect(
      names.some((n) => n.includes("source-sans") && n.endsWith(".woff2")),
    ).toBe(true);
    const css = await zip.file("css/style.css")!.async("string");
    expect(css).toContain("../assets/fonts/");
    expect(css).toContain("@font-face");
    expect(css).toContain('"Oswald"');
    expect(
      names.some((n) => n.includes("source-sans") && n.includes("700")),
    ).toBe(true);
  });

  it("omits font assets when both faces are system residual", async () => {
    const blob = await generateWebsiteZip({
      ...sampleData,
      canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
    });
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(blob);
    const names = Object.keys(zip.files);
    expect(names.some((n) => n.startsWith("assets/fonts/"))).toBe(false);
  });
});
