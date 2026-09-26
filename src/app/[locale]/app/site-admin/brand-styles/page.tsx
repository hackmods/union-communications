import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { BrandStylesAdminForm } from "@/components/site-admin/BrandStylesAdminForm";
import { HostBrandAdminForm } from "@/components/site-admin/HostBrandAdminForm";

export const dynamic = "force-dynamic";

export default async function SiteAdminBrandStylesPage({
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

  const t = await getTranslations({ locale, namespace: "hub.platformOperator" });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <p className="text-sm">
        <Link
          href="/app/site-admin"
          className="font-medium text-opseu-blue underline underline-offset-2"
        >
          ← {t("siteAdminTitle")}
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-bold text-opseu-dark lg:text-3xl">
        {t("brandStylesTitle")}
      </h1>
      <p className="mt-1 text-sm text-opseu-gray-dark">{t("brandStylesBody")}</p>
      <h2 className="mt-8 text-lg font-semibold text-opseu-dark">
        {t("brandStylesUnionsHeading")}
      </h2>
      <p className="mt-1 text-sm text-opseu-gray-dark">
        {t("brandStylesUnionsHint")}
      </p>
      <BrandStylesAdminForm />
      <HostBrandAdminForm />
    </main>
  );
}
