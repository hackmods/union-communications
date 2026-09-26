import { DemoSiteBanner } from "@/components/hub/DemoSiteBanner";
import { SoftLaunchBanner } from "@/components/hub/SoftLaunchBanner";
import { TenantLiveProvider } from "@/components/hub/TenantLiveProvider";
import { PortalFeatureTeaser } from "@/components/portal/PortalFeatureTeaser";
import { PortalMemoryBanner } from "@/components/portal/PortalMemoryBanner";
import { PortalNav } from "@/components/portal/PortalNav";
import { PAGE_SHELL } from "@/lib/constants/page-shell";
import { portalDbBackend } from "@/lib/db/backend";
import { requirePortalPage } from "@/lib/portal/portal-session";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "hub" });
  return {
    robots: { index: false, follow: false },
    title: t("portalLink"),
  };
}

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { roles, portalEnabled } = await requirePortalPage(locale);

  if (!portalEnabled) {
    return (
      <TenantLiveProvider>
        <DemoSiteBanner />
        <SoftLaunchBanner />
        <div className={cn(PAGE_SHELL.wide, "py-4 sm:py-6 md:py-8")}>
          <PortalFeatureTeaser roles={roles} />
        </div>
      </TenantLiveProvider>
    );
  }

  return (
    <TenantLiveProvider>
      <DemoSiteBanner />
      <SoftLaunchBanner />
      <PortalMemoryBanner active={portalDbBackend() === "memory"} />
      <PortalNav />
      <div className={cn(PAGE_SHELL.wide, "py-4 sm:py-6 md:py-8")}>
        {children}
      </div>
    </TenantLiveProvider>
  );
}
