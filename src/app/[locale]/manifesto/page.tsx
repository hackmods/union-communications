import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = {
  title: "Why UnionOps is Free",
  description:
    "UnionOps was built out of solidarity, not for profit. No subscriptions, no data harvesting, no ads.",
  openGraph: {
    title: "Why UnionOps is Free | UnionOps",
    description:
      "UnionOps was built out of solidarity, not for profit. No subscriptions, no data harvesting, no ads.",
  },
  twitter: {
    title: "Why UnionOps is Free | UnionOps",
    description:
      "UnionOps was built out of solidarity, not for profit. No subscriptions, no data harvesting, no ads.",
  },
};

export default async function ManifestoPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("manifesto");

  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold leading-tight text-opseu-dark md:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8 space-y-6 text-lg leading-relaxed text-gray-800">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
        <p className="text-xl font-semibold text-opseu-dark">{t("promiseLead")}</p>
        <p>{t("promiseIntro")}</p>

        <ul className="list-disc space-y-4 pl-6">
          <li>
            <strong className="text-opseu-dark">{t("noSubsTitle")}</strong>{" "}
            {t("noSubsBody")}
          </li>
          <li>
            <strong className="text-opseu-dark">{t("noDataTitle")}</strong>{" "}
            {t("noDataBody")}
          </li>
          <li>
            <strong className="text-opseu-dark">{t("noAdsTitle")}</strong>{" "}
            {t("noAdsBody")}
          </li>
        </ul>

        <p>{t("closing")}</p>
        <p className="text-2xl font-bold text-opseu-blue">{t("slogan")}</p>
      </div>

      <p className="mt-10 text-base text-gray-600">
        {t("supportLead")}{" "}
        <Link href="/support" className="font-semibold text-opseu-blue hover:underline">
          {t("supportLink")}
        </Link>
      </p>

      <p className="mt-12">
        <Link href="/" className="font-semibold text-opseu-blue hover:underline">
          {t("backHome")}
        </Link>
      </p>
    </article>
  );
}
