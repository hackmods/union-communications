import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { redirectUnlessSiteAdmin, requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { EmailOpsPanel } from "@/components/site-admin/EmailOpsPanel";

export const dynamic = "force-dynamic";

export default async function EmailOpsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  redirectUnlessSiteAdmin(locale, gate, "/app/site-admin/email");
  const t = await getTranslations({ locale, namespace: "emailOpsAdmin" });
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <Link
        href="/app/site-admin"
        className="text-sm font-medium text-opseu-blue underline"
      >
        ← {t("back")}
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-opseu-dark lg:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-opseu-gray-dark">{t("intro")}</p>
      <EmailOpsPanel />
    </main>
  );
}
