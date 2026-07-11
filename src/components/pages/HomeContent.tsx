"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold text-opseu-dark md:text-5xl">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/onboarding">
            <Button size="lg">{t("heroCta")}</Button>
          </Link>
          <Link href="/guide/social-media-plan">
            <Button variant="outline" size="lg">{t("socialMediaPlanCta")}</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-gray-500">{t("socialMediaPlanDesc")}</p>
        <p className="mt-4 text-sm text-opseu-blue">{t("privacyNote")}</p>
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
