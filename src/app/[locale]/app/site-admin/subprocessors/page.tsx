import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirectUnlessSiteAdmin, requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { Link } from "@/i18n/navigation";
import { SubprocessorRegistryPanel } from "@/components/site-admin/SubprocessorRegistryPanel";

export const dynamic = "force-dynamic";

export default async function SubprocessorRegistryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, gate, "/app/site-admin/subprocessors");
  const t = await getTranslations({ locale, namespace: "hub.platformOperator.subprocessors" });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <p className="text-sm">
        <Link href="/app/site-admin" className="font-medium text-opseu-blue underline underline-offset-2">
          ← {t("siteAdmin")}
        </Link>
      </p>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">{t("title")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-opseu-gray-dark">{t("body")}</p>
      </header>
      <SubprocessorRegistryPanel />
    </main>
  );
}
