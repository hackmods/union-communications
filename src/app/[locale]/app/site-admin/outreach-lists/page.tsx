import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { OutreachListsAdminPanel } from "@/components/site-admin/OutreachListsAdminPanel";

export const dynamic = "force-dynamic";

export default async function SiteAdminOutreachListsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  if (!gate.ok) redirect(`/${locale}/app`);
  const t = await getTranslations({ locale, namespace: "outreachListsAdmin" });
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark">{t("title")}</h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("intro")}</p>
      </header>
      <OutreachListsAdminPanel />
    </main>
  );
}
