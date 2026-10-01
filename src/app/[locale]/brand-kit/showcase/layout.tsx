import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/brand-kit/showcase", params);
}

export default function BrandKitShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
