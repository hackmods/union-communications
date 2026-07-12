import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BUY_ME_A_COFFEE_URL } from "@/lib/constants/support";

export const metadata: Metadata = {
  title: "Support UnionOps",
  description:
    "UnionOps is free and always will be. Optional coffee tips help cover hosting and keep the tools going.",
  openGraph: {
    title: "Support UnionOps | UnionOps",
    description:
      "UnionOps is free and always will be. Optional coffee tips help cover hosting and keep the tools going.",
  },
  twitter: {
    title: "Support UnionOps | UnionOps",
    description:
      "UnionOps is free and always will be. Optional coffee tips help cover hosting and keep the tools going.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function SupportPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("supportPage");

  return (
    <article className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold leading-tight text-opseu-dark md:text-4xl">
        {t("title")}
      </h1>

      <div className="mt-8 space-y-6 text-lg leading-relaxed text-gray-800">
        <p>{t("p1")}</p>
        <p>{t("p2")}</p>
        <p>{t("p3")}</p>
      </div>

      <p className="mt-10">
        <a
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-md bg-opseu-blue px-5 py-3 text-base font-semibold text-white hover:bg-opseu-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-opseu-blue"
        >
          {t("cta")}
        </a>
      </p>
      <p className="mt-3 text-sm text-gray-500">{t("ctaHint")}</p>

      <p className="mt-12 flex flex-wrap gap-x-4 gap-y-2 text-base">
        <Link href="/manifesto" className="font-semibold text-opseu-blue hover:underline">
          {t("toManifesto")}
        </Link>
        <Link href="/" className="font-semibold text-opseu-blue hover:underline">
          {t("backHome")}
        </Link>
      </p>
    </article>
  );
}
