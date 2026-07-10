import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const stepKeys = ["logo", "boards", "socials", "website"] as const;

const stepLinks: Record<
  (typeof stepKeys)[number],
  { primary: string; secondary: string }
> = {
  logo: {
    primary: "/tools/logo-builder",
    secondary: "/brand-kit",
  },
  boards: {
    primary: "/tools/board-notice",
    secondary: "/guide/union-boards",
  },
  socials: {
    primary: "/tools/graphic-maker",
    secondary: "/guide",
  },
  website: {
    primary: "/tools/website-template",
    secondary: "/guide/website",
  },
};

export default async function SocialMediaPlanPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("socialMediaPlan");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-opseu-dark">{t("title")}</h1>
      <p className="mt-2 text-lg text-gray-600">{t("subtitle")}</p>
      <p className="mt-4 leading-relaxed text-gray-700">{t("intro")}</p>

      <div className="mt-10 space-y-6">
        {stepKeys.map((key) => (
          <Card key={key}>
            <CardTitle>{t(`steps.${key}.title`)}</CardTitle>
            <p className="mt-3 leading-relaxed text-gray-700">
              {t(`steps.${key}.description`)}
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
              {(t.raw(`steps.${key}.checklist`) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={stepLinks[key].primary}>
                <Button size="sm">{t(`steps.${key}.cta`)}</Button>
              </Link>
              <Link href={stepLinks[key].secondary}>
                <Button variant="outline" size="sm">
                  {t(`steps.${key}.secondaryCta`)}
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
