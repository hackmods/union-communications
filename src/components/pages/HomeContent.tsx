"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShareThisTool } from "@/components/share/ShareThisTool";

type ChannelId = "social" | "print" | "boards" | "website";

const channelItems: Record<
  ChannelId,
  { href: string; titleKey: string; guideHref?: string }[]
> = {
  social: [
    { href: "/guide", titleKey: "guide" },
    { href: "/guide/materials", titleKey: "materials" },
    { href: "/guide/crisis", titleKey: "strikeGuide" },
    { href: "/examples", titleKey: "socialExamples" },
    { href: "/captions", titleKey: "captions" },
    { href: "/tools/graphic-maker", titleKey: "graphicMaker" },
    { href: "/tools/resizer", titleKey: "resizer" },
    { href: "/tools/quote-card", titleKey: "quoteCard" },
    { href: "/tools/alt-text", titleKey: "altText" },
  ],
  print: [
    { href: "/tools/flyer-maker", titleKey: "flyerMaker" },
    { href: "/guide/print", titleKey: "printGuide" },
  ],
  boards: [
    { href: "/tools/board-notice", titleKey: "boardNotice" },
    { href: "/tools/solidarity-poster", titleKey: "solidarityPoster" },
    { href: "/tools/qr-card", titleKey: "qrCard" },
    { href: "/guide/union-boards", titleKey: "unionBoardsGuide" },
  ],
  website: [
    { href: "/tools/website-template", titleKey: "websiteTemplate" },
    { href: "/guide/website", titleKey: "websiteGuide" },
  ],
};

const channelOrder: ChannelId[] = ["social", "print", "boards", "website"];

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const common = useTranslations("common");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <section className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-opseu-dark md:text-5xl">{t("title")}</h1>
        <p className="mt-3 text-2xl font-semibold tracking-wide text-opseu-blue md:text-3xl">
          {t("slogan")}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{t("subtitle")}</p>
        <p className="mt-4 text-sm text-opseu-blue">{t("privacyNote")}</p>
        <div className="mt-6 flex justify-center">
          <ShareThisTool />
        </div>
      </section>

      <aside
        className="mb-12 rounded-lg border-l-4 border-opseu-blue bg-opseu-blue/5 px-4 py-3 text-left text-sm text-opseu-dark md:px-5 md:py-4 md:text-base"
        role="note"
      >
        <p>
          <span className="mr-1" aria-hidden="true">
            🔒
          </span>
          {t("trustBanner")}{" "}
          <Link href="/manifesto" className="font-medium underline underline-offset-2 hover:text-opseu-blue">
            {t("trustManifestoLink")}
          </Link>
        </p>
      </aside>

      <section className="mb-16 grid gap-8 md:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-opseu-blue/20 bg-opseu-blue/5 p-6 text-left">
          <h2 className="text-xl font-bold text-opseu-dark">{t("pathCommsTitle")}</h2>
          <p className="mt-3 flex-1 text-base text-gray-600">{t("pathCommsDesc")}</p>
          <p className="mt-3 text-sm text-gray-600">{t("pathCommsHint")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/guide/social-media-plan">
              <Button size="lg">{t("pathCommsCta")}</Button>
            </Link>
            <Link href="/onboarding">
              <Button variant="outline" size="lg">
                {t("heroCta")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6 text-left">
          <h2 className="text-xl font-bold text-opseu-dark">{t("pathOfficerTitle")}</h2>
          <p className="mt-3 flex-1 text-base text-gray-600">{t("pathOfficerDesc")}</p>
          <div className="mt-6">
            <Link href="/app">
              <Button size="lg">{t("pathOfficerCta")}</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <Link href="/brand-kit">
          <Card className="border-opseu-blue/20 bg-opseu-blue/5 transition-shadow hover:shadow-md">
            <CardTitle>{nav("brandKit")}</CardTitle>
            <p className="mt-2 text-sm text-gray-600">
              {nav("logoBuilder")} · {nav("assets")}
            </p>
          </Card>
        </Link>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold text-opseu-dark">{t("channelsTitle")}</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          {channelOrder.map((channel) => (
            <div key={channel}>
              <h3 className="mb-3 text-lg font-semibold text-opseu-dark">
                {t(`channels.${channel}.title`)}
              </h3>
              <p className="mb-3 text-sm text-gray-600">
                {t(`channels.${channel}.description`)}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {channelItems[channel].map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Card className="h-full transition-shadow hover:shadow-md">
                      <CardTitle className="text-base">{nav(item.titleKey)}</CardTitle>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 text-center">
        <Link href="/guide">
          <Button variant="outline">{common("learnMore")}</Button>
        </Link>
      </section>
    </div>
  );
}
