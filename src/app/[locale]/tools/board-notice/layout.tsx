import type { Metadata } from "next";
import { OG_IMAGE_PATH, SITE_NAME, SITE_URL } from "@/lib/seo/site";
import { TOOL_SEO } from "@/lib/seo/tool-meta";

const slug = "board-notice" as const;
const tool = TOOL_SEO[slug];
const ogTitle = `${tool.title} | ${SITE_NAME}`;

export const metadata: Metadata = {
  title: tool.title,
  description: tool.description,
  openGraph: {
    type: "website",
    url: `${SITE_URL}/en/tools/${slug}/`,
    title: ogTitle,
    description: tool.description,
    images: [OG_IMAGE_PATH],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: tool.description,
    images: [OG_IMAGE_PATH],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
