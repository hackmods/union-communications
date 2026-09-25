import { test, expect, type APIRequestContext } from "@playwright/test";

/** Paths from the Sept 2026 live audit that must stay reachable. */
const AUDIT_PATHS = [
  "/en/",
  "/en/utilities/",
  "/en/utilities/rtw-accommodation/",
  "/en/utilities/bylaw-builder/",
  "/en/utilities/local-pack/",
  "/en/utilities/grievance-form-builder/",
  "/en/learn/",
  "/en/learn/library/",
  "/en/learn/library/examples/",
  "/en/learn/library/captions/",
  "/en/learn/library/brand-assets/",
  "/en/learn/steward/",
  "/en/learn/officer/",
  "/en/learn/officer/contract-enforcement/",
  "/en/learn/officer/mobilizer-bargaining-partner/",
  "/en/learn/officer/advanced-local-finance/",
  "/en/learn/officer/duty-of-fair-representation/",
  "/en/learn/dfr/",
  "/en/learn/short-form/",
  "/en/manifesto/",
  "/en/updates/",
  "/en/app/",
  "/fr/utilities/rtw-accommodation/",
  "/fr/learn/library/",
];

const BREADCRUMB_PATHS = [
  "/en/utilities/rtw-accommodation/",
  "/en/learn/officer/contract-enforcement/",
  "/en/learn/library/captions/",
  "/en/learn/library/",
];

async function sitemapPaths(request: APIRequestContext): Promise<string[]> {
  const res = await request.get("/sitemap.xml");
  expect(res.ok()).toBeTruthy();
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => {
    const url = new URL(m[1]);
    return url.pathname;
  });
}

test.describe("union audit site integrity @smoke", () => {
  test("sitemap lists library hub, shelves, and officer modules (not Hub /app)", async ({
    request,
  }) => {
    const paths = await sitemapPaths(request);
    for (const required of [
      "/en/learn/library/",
      "/en/learn/library/examples/",
      "/en/learn/library/captions/",
      "/en/learn/library/brand-assets/",
      "/en/learn/officer/contract-enforcement/",
      "/fr/learn/library/",
    ]) {
      expect(paths, `missing ${required}`).toContain(required);
    }
    // Authenticated Hub must stay out of the public sitemap.
    expect(paths.some((path) => path.includes("/app/"))).toBe(false);
  });


  test("internal links from audit pages resolve", async ({ page, request }) => {
    const seen = new Set<string>();
    const failures: string[] = [];
    for (const path of AUDIT_PATHS) {
      await page.goto(path);
      const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
        anchors
          .map((a) => (a as HTMLAnchorElement).getAttribute("href") || "")
          .filter((href) => href.startsWith("/") && !href.startsWith("//")),
      );
      for (const href of hrefs) {
        const url = new URL(href, "http://localhost:3000");
        const pathname = url.pathname.endsWith("/")
          ? url.pathname
          : `${url.pathname}/`;
        if (
          /^\/(en|fr)\/app\/.+/.test(pathname) &&
          pathname !== "/en/app/" &&
          pathname !== "/fr/app/"
        ) {
          continue;
        }
        if (pathname.startsWith("/api/")) continue;
        const key = pathname + url.search;
        if (seen.has(key)) continue;
        seen.add(key);
        const res = await request.get(pathname + url.search, { maxRedirects: 5 });
        if (res.status() >= 400) {
          failures.push(`${path} -> ${pathname} (${res.status()})`);
        }
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
  test("audit discovery paths respond without 404", async ({ request }) => {
    const failures: string[] = [];
    for (const path of AUDIT_PATHS) {
      const res = await request.get(path, { maxRedirects: 5 });
      if (res.status() >= 400) failures.push(`${path} -> ${res.status()}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test("utilities, officer, and library pages expose breadcrumbs", async ({
    page,
  }) => {
    for (const path of BREADCRUMB_PATHS) {
      await page.goto(path);
      const nav = page.getByRole("navigation", { name: /breadcrumb|fil d/i });
      await expect(nav, path).toBeVisible();
      const text = (await nav.innerText()).replace(/\s+/g, " ");
      if (path.includes("/utilities/")) {
        expect(text).toMatch(/Utilities|Utilitaires/i);
      }
      if (path.includes("/officer/")) {
        expect(text).toMatch(/Officer|dirigeants|apprentissage/i);
      }
      if (path.includes("/library")) {
        expect(text).toMatch(/Library|Biblioth/i);
      }
    }
  });

  test("officer modules do not leak raw markdown markers in body text", async ({
    page,
  }) => {
    for (const path of [
      "/en/learn/officer/mobilizer-bargaining-partner/",
      "/en/learn/officer/advanced-local-finance/",
      "/en/learn/officer/duty-of-fair-representation/",
      "/en/learn/officer/seniority-bumping-layoff/",
    ]) {
      await page.goto(path);
      const body = page.locator("main").first();
      await expect(body).toBeVisible();
      const text = await body.innerText();
      // Literal **bold** or lone backtick pairs should not appear in prose.
      expect(text, path).not.toMatch(/\*\*[^*]+\*\*/);
      // Stray backtick immediately before a slash path (old bug pattern)
      expect(text, path).not.toMatch(/`\s*\/(?:guide|tools|learn)/);
    }
  });

  test("key public images load with non-zero bytes", async ({ page, request }) => {
    // Examples use CSS mockups (no <img>); brand-assets ships real pack images.
    await page.goto("/en/learn/library/brand-assets/");
    const srcs = await page.locator("img[src]").evaluateAll((imgs) =>
      imgs
        .map((img) => (img as HTMLImageElement).getAttribute("src") || "")
        .filter((src) => src && !src.startsWith("data:")),
    );
    expect(srcs.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const src of srcs.slice(0, 12)) {
      const url = src.startsWith("http") ? src : src;
      const res = await request.get(url);
      if (!res.ok()) {
        failures.push(`${src} -> ${res.status()}`);
        continue;
      }
      const buf = await res.body();
      if (!buf.byteLength) failures.push(`${src} empty`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
