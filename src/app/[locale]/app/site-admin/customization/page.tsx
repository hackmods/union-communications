import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { customizationConfigurationError } from "@/lib/auth/customization-session";
import { getAllTenantSeeds } from "@/lib/tenant/loader";
import { CustomizationAdminPanel } from "@/components/customization/CustomizationAdminPanel";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export default async function SiteAdminCustomizationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    if (gate.status === 403) redirect(`/${locale}/app`);
    redirect(`/${locale}/app/login`);
  }

  const t = await getTranslations("hub.platformOperator");
  const configurationError = customizationConfigurationError();
  const unions = getAllTenantSeeds().map((seed) => ({
    id: seed.union.id,
    name: seed.union.name,
    slug: seed.union.slug,
  }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <p className="text-sm">
        <Link
          href="/app/site-admin"
          className="font-medium text-opseu-blue underline underline-offset-2"
        >
          ← {t("siteAdmin")}
        </Link>
      </p>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("customizationTitle")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("customizationBody")}</p>
      </header>
      <CustomizationAdminPanel
        unions={unions}
        enabled={!configurationError}
        configurationError={configurationError}
      />
    </main>
  );
}
