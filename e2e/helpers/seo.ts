import { expect, type Page } from "@playwright/test";

type SeoOptions = {
  titleIncludes: string | RegExp;
  descriptionIncludes?: string | RegExp;
  canonicalPath?: string;
  hreflang?: boolean;
  ogUrlIncludes?: string;
};

export async function assertSeoBasics(page: Page, options: SeoOptions) {
  await expect(page).toHaveTitle(options.titleIncludes);

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute("content", /.+/);
  if (options.descriptionIncludes) {
    await expect(description).toHaveAttribute(
      "content",
      options.descriptionIncludes,
    );
  }

  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /.+/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /.+/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );

  if (options.ogUrlIncludes) {
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      new RegExp(options.ogUrlIncludes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  if (options.canonicalPath) {
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      "href",
      new RegExp(options.canonicalPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }

  if (options.hreflang) {
    await expect(
      page.locator('link[rel="alternate"][hreflang="en"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('link[rel="alternate"][hreflang="fr"]'),
    ).toHaveCount(1);
    await expect(
      page.locator('link[rel="alternate"][hreflang="x-default"]'),
    ).toHaveCount(1);
  }
}
