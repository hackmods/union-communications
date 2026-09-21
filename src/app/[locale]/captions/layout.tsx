import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { PublicCatalogItemLayout } from "@/components/comms/PublicCatalogItemLayout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/captions", params);
}

export default function CaptionsRouteLayout({ children }: { children: React.ReactNode }) {
  return <PublicCatalogItemLayout>{children}</PublicCatalogItemLayout>;
}
