import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GuideLayout } from "@/components/comms/GuideLayout";
import { Callout } from "@/components/ui/Callout";
import { Button } from "@/components/ui/Button";

const steps = ["brandKit", "printMaterials", "welcome"] as const;

export default async function MembershipSignupGuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("membershipSignupGuide");
  const nav = await getTranslations("nav");

  return (
    <GuideLayout
      title={t("title")}
      subtitle={t("subtitle")}
      intro={t("intro")}
      relatedLabel={t("relatedLabel")}
      relatedLinks={[
        { href: "/brand-kit", label: nav("brandKit") },
        { href: "/tools/qr-board", label: nav("qrBoard") },
        { href: "/tools/qr-card", label: nav("qrCard") },
        { href: "/tools/solidarity-poster", label: nav("solidarityPoster") },
        {
          href: "/tools/document-generator",
          label: nav("documentGenerator"),
        },
        { href: "/guide/union-boards", label: nav("unionBoardsGuide") },
      ]}
    >
      <Callout className="mb-8">
        <p className="font-semibold text-opseu-dark">{t("whyTitle")}</p>
        <p className="mt-1">{t("whyBody")}</p>
      </Callout>

      <ol className="space-y-8">
        {steps.map((key, i) => (
          <li key={key} className="border-l-2 border-opseu-blue/30 pl-5">
            <div className="flex items-baseline gap-3">
              <span
                className="text-sm font-bold tabular-nums text-opseu-blue"
                aria-hidden="true"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 className="text-xl font-bold text-opseu-dark">
                {t(`steps.${key}.title`)}
              </h2>
            </div>
            <p className="mt-3 max-w-prose leading-relaxed text-gray-700">
              {t(`steps.${key}.body`)}
            </p>
            {key === "brandKit" ? (
              <div className="mt-4">
                <Link href="/brand-kit">
                  <Button>{t("steps.brandKit.cta")}</Button>
                </Link>
              </div>
            ) : null}
            {key === "printMaterials" ? (
              <nav
                className="mt-4 flex flex-wrap gap-3"
                aria-label={t("steps.printMaterials.title")}
              >
                <Link href="/tools/qr-board">
                  <Button variant="outline">{t("steps.printMaterials.qrBoard")}</Button>
                </Link>
                <Link href="/tools/qr-card">
                  <Button variant="outline">{t("steps.printMaterials.qrCard")}</Button>
                </Link>
                <Link href="/tools/solidarity-poster">
                  <Button variant="outline">
                    {t("steps.printMaterials.poster")}
                  </Button>
                </Link>
              </nav>
            ) : null}
            {key === "welcome" ? (
              <div className="mt-4">
                <Link href="/tools/document-generator">
                  <Button variant="outline">{t("steps.welcome.cta")}</Button>
                </Link>
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <Callout tone="muted" className="mt-10">
        <p className="font-semibold text-opseu-dark">{t("tipTitle")}</p>
        <p className="mt-1">{t("tipBody")}</p>
      </Callout>
    </GuideLayout>
  );
}
