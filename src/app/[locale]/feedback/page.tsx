import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ComposedPageLayout } from "@/components/layout/ComposedPageLayout";
import { SiteFeedbackForm } from "@/components/feedback/SiteFeedbackForm";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PublicHubPanel } from "@/components/comms/PublicHubPanel";
import { buildPublicPageMetadata } from "@/lib/seo/public-page-meta";
import { PUBLIC_PAGE_TITLE_CLASS } from "@/lib/constants/public-type";
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
    <ComposedPageLayout composition="hub" size="wide" className="py-10 md:py-14">
      <header className="max-w-3xl">
        <Eyebrow tone="brand">{t("title")}</Eyebrow>
        <h1 className={`${PUBLIC_PAGE_TITLE_CLASS} mt-2`}>{t("title")}</h1>
        <p className="mt-6 max-w-prose text-lg leading-relaxed text-slate-700">
          {t("lead")}
        </p>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-700">
          {t("notLocal")}
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:gap-8">
        <PublicHubPanel className="p-5 sm:p-6 md:p-8">
          <SiteFeedbackForm
            variant="public"
            defaultCategory={asCategory(query.category)}
            defaultPagePath={asPagePath(query.from)}
            memoryBackend={isFeedbackMemoryBackend()}
          />
        </PublicHubPanel>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <PublicHubPanel>
            <p className="text-sm leading-relaxed text-slate-700">
              {t("githubLead")}{" "}
              <Link
                href="/support"
                className="font-semibold text-opseu-blue underline-offset-2 hover:underline"
              >
                {t("githubLink")}
              </Link>
            </p>
          </PublicHubPanel>
        </aside>
      </div>
    </ComposedPageLayout>
  );
}
