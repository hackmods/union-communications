import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { redirectUnlessSiteAdmin, requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { buildObservabilityHealth } from "@/lib/observability/config";
import { ObservabilityPanelClient } from "@/components/site-admin/ObservabilityPanelClient";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function SiteAdminObservabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, gate, "/app/site-admin/observability");

  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });
  const health = buildObservabilityHealth();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <p className="text-sm">
        <Link
          href="/app/site-admin"
          className="font-medium text-opseu-blue underline underline-offset-2"
        >
          ← {t("siteAdmin")}
        </Link>
      </p>
      <div className="mt-4">
        <ObservabilityPanelClient initialHealth={health} />
      </div>
    </main>
  );
}
