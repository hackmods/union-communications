"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function HomeContent() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");
  const common = useTranslations("common");

  const education = [
    { href: "/guide", title: nav("guide"), desc: "Step-by-step handbook for local social media" },
    { href: "/guide/crisis", title: nav("crisis"), desc: "Strike, layoffs, and management pushback guidance" },
    { href: "/examples", title: nav("examples"), desc: "Real examples of excellent local union posts" },
    { href: "/captions", title: nav("captions"), desc: "Reusable captions and hashtags" },
    { href: "/assets", title: nav("assets"), desc: "CAAT OPSEU official logos and colours" },
  ];

  const tools = [
    { href: "/tools/logo-builder", title: nav("logoBuilder") },
    { href: "/tools/graphic-maker", title: nav("graphicMaker") },
    { href: "/tools/resizer", title: nav("resizer") },
    { href: "/tools/quote-card", title: nav("quoteCard") },
    { href: "/tools/flyer-maker", title: nav("flyerMaker") },
    { href: "/tools/alt-text", title: nav("altText") },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold text-opseu-dark md:text-5xl">{t("title")}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">{t("subtitle")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/onboarding">
            <Button size="lg">{t("heroCta")}</Button>
          </Link>
          <Link href="/guide">
            <Button variant="outline" size="lg">{common("learnMore")}</Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-opseu-blue">{t("privacyNote")}</p>
      </section>

      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-bold text-opseu-dark">{t("educationTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {education.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardTitle>{item.title}</CardTitle>
                <p className="mt-2 text-sm text-gray-600">{item.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold text-opseu-dark">{t("toolsTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardTitle>{item.title}</CardTitle>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
