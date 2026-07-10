import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const sectionKeys = ["when", "flyers", "boards", "digital"] as const;

export default async function PrintGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("printGuide");
  const nav = await getTranslations("nav");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>

      <div className="mt-10 space-y-6">
        {sectionKeys.map((key) => (
          <Card key={key}>
            <CardTitle>{t(`sections.${key}.title`)}</CardTitle>
            <p className="mt-3 leading-relaxed text-gray-700">
              {t(`sections.${key}.content`)}
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/tools/flyer-maker">
          <Button variant="outline">{nav("flyerMaker")}</Button>
        </Link>
        <Link href="/tools/board-notice">
          <Button variant="outline">{nav("boardNotice")}</Button>
        </Link>
      </div>
    </div>
  );
}
