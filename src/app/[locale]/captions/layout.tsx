import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/captions", params);
}

export default function CaptionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
