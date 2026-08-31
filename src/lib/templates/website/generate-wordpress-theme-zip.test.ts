import { describe, it, expect } from "vitest";
import {
  buildWordpressFunctionsPhp,
  buildWordpressStyleCss,
  encodeWordpressScreenshotPng,
  extractWebsiteBodyMarkup,
  generateWordpressThemeZip,
  injectWordpressNav,
  rewriteWebsiteAssetsForWordpress,
  splitWebsiteChrome,
  wordpressThemeName,
  wordpressThemeSlug,
} from "@/lib/templates/website/generate-wordpress-theme-zip";
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
  officers: [{ name: "Jane Doe", role: "President", location: "WC-101" }],
  logoFileName: "logo.png",
  logoPreviewSrc: "/assets/caat-opseu/logo-primary.png",
  logoAlt: "OPSEU SEFPO Local 243",
  includeOpseuResources: true,
};

async function loadThemeZip(
  data: WebsiteTemplateData = sampleData,
  logo?: { fileName: string; bytes: Uint8Array } | null,
  hero?: { fileName: string; bytes: Uint8Array } | null,
) {
  const blob = await generateWordpressThemeZip(data, logo, hero);
  const JSZip = (await import("jszip")).default;
  return JSZip.loadAsync(blob);
}

function themePath(name: string): string {
  return `unionops-local-243/${name}`;
}

describe("wordpress theme slug and name", () => {
  it("builds a safe folder slug from the local number", () => {
    expect(wordpressThemeSlug("243")).toBe("unionops-local-243");
    expect(wordpressThemeSlug(" 243-FT ")).toBe("unionops-local-243-ft");
    expect(wordpressThemeSlug("../Evil Theme")).toBe("unionops-local-evil-theme");
    expect(wordpressThemeSlug("")).toBe("unionops-local");
  });

  it("strips CSS-comment breakers from the theme name", () => {
    expect(wordpressThemeName("Local */ 243", "243")).toBe("Local 243");
    expect(wordpressThemeName("", "243")).toBe("Local 243");
  });
});

describe("wordpress theme markup helpers", () => {
  it("drops document chrome and the site.js tag from the body", () => {
    const body = extractWebsiteBodyMarkup(`<!DOCTYPE html>
<html><head><title>x</title></head>
<body>
  <header>Hi</header>
  <script src="./js/site.js"></script>
</body></html>`);
    expect(body).toContain("<header>Hi</header>");
    expect(body).not.toContain("<script");
    expect(body).not.toContain("DOCTYPE");
  });

  it("rewrites asset paths to the WordPress theme URI helper", () => {
    const out = rewriteWebsiteAssetsForWordpress(
      '<img src="./assets/logo.png" alt="x">',
    );
    expect(out).toContain("get_template_directory_uri()");
    expect(out).toContain("/assets/logo.png");
    expect(out).not.toContain("./assets/");
  });

  it("splits the site header and footer from the main sections", () => {
    const parts = splitWebsiteChrome(`
<header class="site-header"><p>Nav</p></header>
<section id="home">Hero</section>
<footer class="footer"><p>Office</p></footer>
`);
    expect(parts.header).toContain("site-header");
    expect(parts.footer).toContain("Office");
    expect(parts.main).toContain('id="home"');
    expect(parts.main).not.toContain("site-header");
    expect(parts.main).not.toContain("class=\"footer\"");
  });

  it("swaps the hardcoded nav for a WordPress menu with fallback", () => {
    const out = injectWordpressNav(
      '<header><ul class="nav-links"><li><a href="#home">Home</a></li></ul></header>',
      "unionops_local_243",
    );
    expect(out).toContain("wp_nav_menu");
    expect(out).toContain("unionops_local_243_nav_fallback");
    expect(out).not.toContain('href="#home"');
  });
});

describe("generateWordpressThemeZip", () => {
  it("packs a classic theme folder WordPress can upload", async () => {
    const zip = await loadThemeZip(sampleData, {
      fileName: "logo.png",
      bytes: new Uint8Array([1, 2, 3]),
    });
    const names = Object.keys(zip.files);
    expect(names).toContain(themePath("style.css"));
    expect(names).toContain(themePath("functions.php"));
    expect(names).toContain(themePath("header.php"));
    expect(names).toContain(themePath("footer.php"));
    expect(names).toContain(themePath("index.php"));
    expect(names).toContain(themePath("front-page.php"));
    expect(names).toContain(themePath("page.php"));
    expect(names).toContain(themePath("404.php"));
    expect(names).toContain(themePath("screenshot.png"));
    expect(names).toContain(themePath("js/site.js"));
    expect(names).toContain(themePath("README.md"));
    expect(names).toContain(themePath("unionops-website.json"));
    expect(names).toContain(themePath("assets/logo.png"));
    expect(names.some((n) => n.endsWith("index.html"))).toBe(false);
    expect(names.some((n) => n === "style.css" || n === "index.php")).toBe(
      false,
    );
  });

  it("writes a WordPress stylesheet header and Brand Kit colours", async () => {
    const css = buildWordpressStyleCss(sampleData);
    expect(css.startsWith("/*")).toBe(true);
    expect(css).toContain("Theme Name: OPSEU SEFPO Local 243");
    expect(css).toContain("Text Domain: unionops-local-243");
    expect(css).toContain("does not host, update, or support WordPress");
    expect(css).toContain("--color-primary: #003DA5");
    expect(css).toContain("url(\"assets/fonts/");
    expect(css).toContain(".skip-link");
    expect(css).toContain(".site-content--entry");
    const zip = await loadThemeZip({
      ...sampleData,
      canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
    });
    const packed = await zip.file(themePath("style.css"))!.async("string");
    expect(packed.startsWith("/*")).toBe(true);
    expect(packed).toContain("Theme Name:");
  });

  it("enqueues CSS/JS and bakes an escaped document title", () => {
    const php = buildWordpressFunctionsPhp({
      ...sampleData,
      unionName: "Local O'Brien <script>",
    });
    expect(php).toContain("if (!defined('ABSPATH'))");
    expect(php).toContain("wp_enqueue_style");
    expect(php).toContain("wp_enqueue_script");
    expect(php).toContain("get_stylesheet_uri()");
    expect(php).toContain("/js/site.js");
    expect(php).toContain("pre_get_document_title");
    expect(php).toContain("Local O\\'Brien <script>");
    expect(php).toContain("unionops_local_243_enqueue");
    expect(php).toContain("wp_dequeue_style('wp-block-library')");
    expect(php).toContain("register_nav_menus");
    expect(php).toContain("'primary'");
    expect(php).toContain("unionops_local_243_nav_fallback");
    expect(php).toContain("is_front_page()");
    expect(php).toContain("home_url('/')");
  });

  it("puts steward copy in index.php with escaped HTML and theme URI assets", async () => {
    const zip = await loadThemeZip(
      {
        ...sampleData,
        officers: [{ name: "Jane <b>Doe</b>", role: "President", location: "" }],
        canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
      },
      { fileName: "logo.png", bytes: new Uint8Array([1, 2, 3]) },
    );
    const index = await zip.file(themePath("index.php"))!.async("string");
    expect(index).toContain("get_header()");
    expect(index).toContain("get_footer()");
    expect(index).toContain('id="content"');
    expect(index).toContain("OPSEU SEFPO Local 243");
    expect(index).toContain("Jane &lt;b&gt;Doe&lt;/b&gt;");
    expect(index).not.toContain("<b>Doe</b>");
    expect(index).toContain("mailto:local243@example.com");
    expect(index).not.toContain("./js/site.js");
    expect(index).not.toContain("<script");
    expect(index).not.toContain("site-header");
    const header = await zip.file(themePath("header.php"))!.async("string");
    expect(header).toContain("wp_body_open()");
    expect(header).toContain('href="#content"');
    expect(header).toContain("Skip to content");
    expect(header).toContain("wp_nav_menu");
    expect(header).toContain("unionops_local_243_nav_fallback");
    expect(header).toContain("site-header");
    expect(header).toContain("get_template_directory_uri()");
    expect(header).toContain("/assets/logo.png");
    expect(header).not.toContain("./assets/");
    const front = await zip.file(themePath("front-page.php"))!.async("string");
    expect(front).toContain("index.php");
  });

  it("keeps unsafe hrefs out of the PHP page", async () => {
    const zip = await loadThemeZip({
      ...sampleData,
      customLinks: [{ label: "Nope", url: "javascript:alert(1)" }],
      canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
    });
    const footer = await zip.file(themePath("footer.php"))!.async("string");
    expect(footer).not.toContain("javascript:");
  });

  it("README says UnionOps does not support WordPress", async () => {
    const zip = await loadThemeZip({
      ...sampleData,
      canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
    });
    const readme = await zip.file(themePath("README.md"))!.async("string");
    expect(readme).toMatch(/does not support WordPress/i);
    expect(readme).toContain("Appearance");
    expect(readme).toContain("GitHub Pages");
    expect(readme).toContain("Primary menu");
    expect(readme).toContain("page not found");
    expect(readme).toContain("unionops.org/tools/website-template");
    expect(readme).toContain("unionops-website.json");
  });

  it("bundles webfonts next to style.css at the theme root", async () => {
    const zip = await loadThemeZip({
      ...sampleData,
      canvas: { headlineFontId: "oswald", bodyFontId: "sourceSans" },
    });
    const names = Object.keys(zip.files);
    expect(names).toContain(themePath("assets/fonts/NOTICE.txt"));
    expect(
      names.some((n) => n.includes("oswald") && n.endsWith(".woff2")),
    ).toBe(true);
    const css = await zip.file(themePath("style.css"))!.async("string");
    expect(css).toContain("assets/fonts/");
    expect(css).not.toContain("../assets/fonts");
  });

  it("bundles an uploaded hero photo", async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const zip = await loadThemeZip(
      {
        ...sampleData,
        heroArtId: "arc",
        canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
      },
      null,
      { fileName: "hero.jpg", bytes },
    );
    const names = Object.keys(zip.files);
    expect(names).toContain(themePath("assets/hero.jpg"));
    expect(names).not.toContain(themePath("assets/hero.svg"));
    const index = await zip.file(themePath("index.php"))!.async("string");
    expect(index).toContain("hero.jpg");
  });

  it("lets WordPress pages and 404s use the shared chrome", async () => {
    const zip = await loadThemeZip({
      ...sampleData,
      canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
    });
    const page = await zip.file(themePath("page.php"))!.async("string");
    expect(page).toContain("the_title()");
    expect(page).toContain("the_content()");
    expect(page).toContain('id="content"');
    const missing = await zip.file(themePath("404.php"))!.async("string");
    expect(missing).toContain("Page not found");
    expect(missing).toContain("home_url('/')");
    expect(missing).not.toContain("Your Executive Committee");
  });

  it("writes a valid PNG screenshot in brand colours", async () => {
    const png = encodeWordpressScreenshotPng("#003DA5", "#FFFFFF");
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(png.length).toBeGreaterThan(100);
    const zip = await loadThemeZip({
      ...sampleData,
      canvas: { headlineFontId: "systemSans", bodyFontId: "systemSans" },
    });
    const packed = await zip.file(themePath("screenshot.png"))!.async("uint8array");
    expect([...packed.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
