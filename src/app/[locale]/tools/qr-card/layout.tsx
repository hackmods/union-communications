import type { Metadata } from "next";
import { buildToolLayoutMetadata } from "@/lib/seo/tool-layout-metadata";

const slug = "qr-card" as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildToolLayoutMetadata(slug, params);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
