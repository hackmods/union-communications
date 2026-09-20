import type { Metadata } from "next";
import { buildToolLayoutMetadata } from "@/lib/seo/tool-layout-metadata";
import { assertPublicToolAvailable } from "@/lib/public-tools/assert-available";

const slug = "proposal-tracker" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildToolLayoutMetadata(slug, params);
}

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPublicToolAvailable(slug);
  return children;
}
