import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Card } from "@/components/ui/Card";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { PUBLIC_CARD_TITLE_CLASS } from "@/lib/constants/public-type";
import { LocalPortalPassAlong } from "./LocalPortalPassAlong";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/local-portal", params);
}

const BULLETS = [
  { titleKey: "bulletTogetherTitle", bodyKey: "bulletTogether" },
  { titleKey: "bulletCirclesTitle", bodyKey: "bulletCircles" },
  { titleKey: "bulletDispatchTitle", bodyKey: "bulletDispatch" },
  { titleKey: "bulletSafeTitle", bodyKey: "bulletSafe" },
] as const;

export default async function LocalPortalSharePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "localPortalShare" });

  return (
    <ComposedPageLayout
      composition="narrow"
      className="py-8 [overflow-wrap:anywhere] md:py-12"
    >
      <header>
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="mt-2 text-[clamp(2rem,7vw,2.75rem)] font-bold leading-[1.08] tracking-tight text-opseu-dark">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-prose text-lg leading-relaxed text-slate-700">
          {t("intro")}
        </p>
      </header>

      <ul className="mt-8 grid gap-3">
        {BULLETS.map((bullet) => (
          <li key={bullet.titleKey}>
            <Card variant="ghost" density="compact">
              <p className={PUBLIC_CARD_TITLE_CLASS}>{t(bullet.titleKey)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                {t(bullet.bodyKey)}
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <p className="mt-6 max-w-prose text-sm leading-relaxed text-slate-700">
        {t("costNote")}
      </p>

      <div className="mt-8 grid gap-3">
        <ButtonLink href="/join" size="lg" block trailingArrow>
          {t("primaryCta")}
        </ButtonLink>
        <ButtonLink href="/request-access" variant="outline" size="lg" block>
          {t("secondaryCta")}
        </ButtonLink>
      </div>

      <p className="mt-5 flex flex-col gap-2 text-sm leading-relaxed text-slate-700">
        <Link
          href="/start"
          className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2"
        >
          {t("startLink")}
        </Link>
        <Link
          href="/platform"
          className="inline-flex min-h-11 items-center font-semibold text-opseu-blue underline underline-offset-2"
        >
          {t("platformLink")}
        </Link>
      </p>

      <LocalPortalPassAlong />
    </ComposedPageLayout>
  );
}
