import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirectUnlessSiteAdmin, requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { isDemoPurgeEnabled } from "@/lib/features/demo-purge";
import { countHighMembershipIntegrityIssues } from "@/lib/site-admin/membership-integrity";
import { isPostgresConfigured } from "@/lib/db/client";
import { isMfaEnabled } from "@/lib/auth/mfa-policy";
import { resolveAttachmentStorageMode } from "@/lib/attachments/storage";
import { buildHealthStatus } from "@/lib/ops/health-status";
import { buildHostReadiness } from "@/lib/ops/host-readiness";
import {
  SiteAdminLandingClient,
  type SiteAdminLandingCard,
  type SiteAdminLandingSection,
} from "@/components/site-admin/SiteAdminLandingClient";

export const dynamic = "force-dynamic";

export default async function SiteAdminLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, gate, "/app/site-admin");

  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });
  const demoPurgeOn = isDemoPurgeEnabled();
  const highIntegrity =
    isPostgresConfigured() ? await countHighMembershipIntegrityIssues() : 0;
  const hostReadiness = buildHostReadiness(await buildHealthStatus());
  const missingHostCount =
    hostReadiness.missingBackendFlips.length +
    hostReadiness.missingBlockingPresence.length;
  const publicDocumentsBlocked =
    !isMfaEnabled() ||
    !isPostgresConfigured() ||
    (process.env.NODE_ENV === "production" &&
      resolveAttachmentStorageMode() !== "s3");

  const card = (
    id: string,
    href: string,
    title: string,
    body: string,
    tone?: SiteAdminLandingCard["tone"],
  ): SiteAdminLandingCard => ({ id, href, title, body, tone });

  const usersAccess: SiteAdminLandingCard[] = [
    card("/users", "/app/site-admin/users", t("users"), t("usersBody")),
    card(
      "/account-support",
      "/app/site-admin/account-support",
      t("accountSupport"),
      t("accountSupportBody"),
    ),
    card(
      "/access-requests",
      "/app/site-admin/access-requests",
      t("accessRequestsTitle"),
      t("accessRequestsBody"),
    ),
    card(
      "/organization",
      "/app/site-admin/organization",
      t("organization"),
      t("organizationBody"),
    ),
    card(
      "/membership-integrity",
      "/app/site-admin/membership-integrity",
      highIntegrity > 0
        ? t("membershipIntegrityWithCount", { count: highIntegrity })
        : t("membershipIntegrity"),
      t("membershipIntegrityBody"),
      highIntegrity > 0 ? "warn" : "default",
    ),
    card("/invites", "/app/invites", t("invites"), t("invitesBody")),
    ...(demoPurgeOn
      ? [
          card(
            "/demo-cleanup",
            "/app/site-admin/demo-cleanup",
            t("demoCleanup"),
            t("demoCleanupBody"),
            "warn",
          ),
        ]
      : []),
  ];

  const contentComms: SiteAdminLandingCard[] = [
    card(
      "/product-news",
      "/app/site-admin/product-news",
      t("productNewsCardTitle"),
      t("productNewsCardBody"),
    ),
    card(
      "/outreach-lists",
      "/app/site-admin/outreach-lists",
      t("outreachListsCardTitle"),
      t("outreachListsCardBody"),
    ),
    card(
      "/email",
      "/app/site-admin/email",
      t("emailOpsCardTitle"),
      t("emailOpsCardBody"),
    ),
    card(
      "/public-tools",
      "/app/site-admin/public-tools",
      t("publicTools"),
      t("publicToolsCardBody"),
    ),
    card(
      "/customization",
      "/app/site-admin/customization",
      t("customizationCard"),
      t("customizationCardBody"),
    ),
    card(
      "/documents",
      "/app/site-admin/documents",
      t("publicDocuments"),
      publicDocumentsBlocked
        ? t("publicDocumentsBodyBlocked")
        : t("publicDocumentsBody"),
      publicDocumentsBlocked ? "warn" : "default",
    ),
    card(
      "/hosted-plans",
      "/app/site-admin/hosted-plans",
      t("hostedPlansCardTitle"),
      t("hostedPlansCardBody"),
    ),
  ];

  const complianceTrust: SiteAdminLandingCard[] = [
    card(
      "/subprocessors",
      "/app/site-admin/subprocessors",
      t("subprocessorsCardTitle"),
      t("subprocessorsCardBody"),
    ),
    card(
      "/incidents",
      "/app/site-admin/incidents",
      t("incidentsCardTitle"),
      t("incidentsCardBody"),
      "warn",
    ),
    card(
      "/operator-audit",
      "/app/site-admin/operator-audit",
      t("operatorAuditCardTitle"),
      t("operatorAuditCardBody"),
    ),
    card("/audit", "/app/audit", t("audit"), t("auditBody")),
    card("/feedback", "/app/feedback", t("feedback"), t("feedbackBody")),
  ];

  const hostOps: SiteAdminLandingCard[] = [
    card(
      "/host",
      "/app/site-admin/host",
      t("hostCardTitle"),
      missingHostCount > 0
        ? t("hostCardBodyWarn", { count: missingHostCount })
        : t("hostCardBody"),
      missingHostCount > 0 ? "warn" : "default",
    ),
    card(
      "/observability",
      "/app/site-admin/observability",
      t("observabilityCardTitle"),
      t("observabilityCardBody"),
    ),
    card(
      "/brand-styles",
      "/app/site-admin/brand-styles",
      t("brandStylesCard"),
      t("brandStylesCardBody"),
    ),
    card(
      "/configuration",
      "/app/configuration",
      t("modulesCard"),
      t("modulesCardBody"),
    ),
  ];

  const sections: SiteAdminLandingSection[] = [
    { id: "usersAccess", cards: usersAccess },
    { id: "contentComms", cards: contentComms },
    { id: "complianceTrust", cards: complianceTrust },
    { id: "hostOps", cards: hostOps },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("siteAdminTitle")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("siteAdminBody")}</p>
      </header>

      <SiteAdminLandingClient sections={sections} />
    </main>
  );
}
