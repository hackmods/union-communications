import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { SourcesBlock } from "@/components/comms/SourcesBlock";
import { Button } from "@/components/ui/Button";

const stepKeys = ["logo", "boards", "socials", "website"] as const;

const stepLinks: Record<
  (typeof stepKeys)[number],
  { primary: string; secondary: string; tertiary?: { href: string; labelKey: string }[] }
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
    secondary: "/captions",
    tertiary: [
      { href: "/examples", labelKey: "tertiaryExamples" },
      { href: "/guide", labelKey: "tertiaryBlueprint" },
    ],
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
  const ts = await getTranslations("sources");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/guide/resources", label: t("pathLinks.resourcesShort") },
        { href: "/guide", label: t("pathLinks.blueprintShort") },
      ]}
      footer={
        <SourcesBlock
          pageId="socialMediaPlan"
          title={ts("title")}
          intro={ts("intro")}
        />
      }
    >
      <nav
        className="mb-8 flex flex-wrap gap-2"
        aria-label={t("stepsNavLabel")}
      >
        {stepKeys.map((key, index) => (
          <a
            key={key}
            href={`#step-${key}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-opseu-dark transition-colors hover:border-opseu-blue/40 hover:bg-opseu-blue/5"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-md bg-opseu-blue text-xs font-bold text-white"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {t(`steps.${key}.navLabel`)}
          </a>
        ))}
      </nav>

      <ol className="space-y-8">
        {stepKeys.map((key, index) => (
          <li
            key={key}
            id={`step-${key}`}
            className="scroll-mt-28 border-l-2 border-opseu-blue/30 pl-5"
          >
            <div className="flex items-baseline gap-3">
              <span
                className="text-sm font-bold tabular-nums text-opseu-blue"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h2 className="text-xl font-bold text-opseu-dark">
                {t(`steps.${key}.title`)}
              </h2>
            </div>
            <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
              {t(`steps.${key}.description`)}
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
              {(t.raw(`steps.${key}.checklist`) as string[]).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <div className="button-row mt-4 max-w-lg">
              <Link href={stepLinks[key].primary}>
                <Button size="sm">{t(`steps.${key}.cta`)}</Button>
              </Link>
              <Link href={stepLinks[key].secondary}>
                <Button variant="outline" size="sm">
                  {t(`steps.${key}.secondaryCta`)}
                </Button>
              </Link>
              {stepLinks[key].tertiary?.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button variant="ghost" size="sm">
                    {t(`steps.${key}.${link.labelKey}`)}
                  </Button>
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </GuideLayout>
  );
}
