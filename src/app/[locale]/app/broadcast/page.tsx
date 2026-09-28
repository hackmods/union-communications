import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BroadcastBoard } from "@/components/hub/BroadcastBoard";

export const dynamic = "force-dynamic";

export default async function BroadcastPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const t = await getTranslations({ locale, namespace: "hub.broadcast" });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-2 text-sm text-opseu-gray-dark">{t("intro")}</p>
      <div className="mt-6">
        <BroadcastBoard />
      </div>
    </main>
  );
}
