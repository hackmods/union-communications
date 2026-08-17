import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { SiteFeedbackForm } from "@/components/feedback/SiteFeedbackForm";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { isFeedbackMemoryBackend } from "@/lib/platform-feedback/durable";
import {
  SITE_FEEDBACK_CATEGORIES,
  type SiteFeedbackCategory,
} from "@/types/platform-feedback";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  return buildPublicPageMetadata("/feedback", params);
}

function asCategory(value: string | undefined): SiteFeedbackCategory | undefined {
  if (!value) return undefined;
  return SITE_FEEDBACK_CATEGORIES.includes(value as SiteFeedbackCategory)
    ? (value as SiteFeedbackCategory)
    : undefined;
}

function asPagePath(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return undefined;
  return trimmed.slice(0, 200);
}

export default async function FeedbackPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; from?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("feedbackPage");

  return (
    <PageShell size="focus" className="py-8 md:py-12" as="article">
      <h1 className="text-2xl font-bold leading-tight text-opseu-dark md:text-4xl">
        {t("title")}
      </h1>
      <p className="mt-4 max-w-prose text-lg leading-relaxed text-gray-800">
        {t("lead")}
      </p>
      <p className="mt-3 max-w-prose text-base leading-relaxed text-gray-700">
        {t("notLocal")}
      </p>

      <div className="mt-8">
        <SiteFeedbackForm
          variant="public"
          defaultCategory={asCategory(query.category)}
          defaultPagePath={asPagePath(query.from)}
          memoryBackend={isFeedbackMemoryBackend()}
        />
      </div>

      <p className="mt-10 text-sm text-gray-600">
        {t("githubLead")}{" "}
        <Link href="/support" className="font-semibold text-opseu-blue hover:underline">
          {t("githubLink")}
        </Link>
      </p>
    </PageShell>
  );
}
