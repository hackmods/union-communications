import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
import { PortalMemoryBanner } from "@/components/portal/PortalMemoryBanner";
import { PortalNav } from "@/components/portal/PortalNav";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePortalPage(locale);

  return (
    <>
      <DemoSiteBanner />
      <PortalMemoryBanner />
      <PortalNav />
      <div className={cn(PAGE_SHELL.wide, "py-4 sm:py-6 md:py-8")}>
        {children}
      </div>
    </>
  );
}
