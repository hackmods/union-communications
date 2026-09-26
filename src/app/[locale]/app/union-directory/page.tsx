import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUnionAdminSession } from "@/lib/auth/union-admin-session";
import { UnionDirectoryBoard } from "@/components/hub/UnionDirectoryBoard";

export const dynamic = "force-dynamic";

export default async function UnionDirectoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const gate = await requireUnionAdminSession();
  if (!gate.ok) redirect(gate.status === 401 ? `/${locale}/app/login` : `/${locale}/app`);
  const t = await getTranslations({ locale, namespace: "hub.unionAdmin" });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 lg:py-12">
      <Link href="/app" className="text-sm font-medium text-opseu-blue underline underline-offset-2">← {t("backToHub")}</Link>
      <h1 className="mt-3 text-2xl font-bold text-opseu-dark lg:text-3xl">{t("directoryTitle")}</h1>
      <p className="mt-2 text-sm text-gray-600">{t("directoryIntro")}</p>
      <UnionDirectoryBoard />
    </main>
  );
}
