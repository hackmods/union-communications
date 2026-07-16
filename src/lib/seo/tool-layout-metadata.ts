import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";
import { getToolSeo } from "@/lib/seo/tool-meta";

export async function buildToolLayoutMetadata(
  slug: string,
  params: Promise<{ locale: string }>,
): Promise<Metadata> {
  const { locale } = await params;
  const tool = getToolSeo(locale, slug);
  return buildPageMetadata({
    locale,
    path: `/tools/${slug}`,
    title: tool.title,
    description: tool.description,
  });
}
