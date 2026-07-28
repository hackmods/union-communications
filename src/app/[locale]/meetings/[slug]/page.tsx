import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { NextMeetingSnippet } from "@/components/meetings/NextMeetingSnippet";
import { computeNextMeeting } from "@/lib/meetings/recurrence";
import { meetingsStore } from "@/lib/meetings/store";
import { buildPageMetadata } from "@/lib/seo/build-page-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === "fr" ? "Prochaine réunion" : "Next meeting";
  const description =
    locale === "fr"
      ? "Page publique de la prochaine réunion — partage et QR, pas un portail membre."
      : "Public next-meeting page for share and QR — not a member portal.";
  return buildPageMetadata({
    locale,
    path: "/meetings",
    title,
    description,
    noIndex: true,
  });
}

/**
 * Public, unauthenticated "next meeting" page — for embed/share (e.g. QR on a
 * board notice). No login, no union/local ids, no member data. See
 * docs/modules/CALENDAR_MEETINGS.md Phase A.
 */
export default async function NextMeetingPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("meetingPublic");

  const schedule = await meetingsStore.getBySlug(slug);
  const nextMeeting = schedule ? computeNextMeeting(schedule) : null;

  return (
    <PageShell>
      <article className="mx-auto max-w-lg space-y-4 py-10">
        <header className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold text-opseu-dark">
            {t("heading")}
          </h1>
        </header>
        {schedule ? (
          <NextMeetingSnippet
            nextMeeting={nextMeeting}
            labels={{
              title: t("nextMeeting"),
              noMeeting: t("noMeeting"),
              at: t("at"),
            }}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
            <p className="text-gray-600">{t("notFound")}</p>
          </div>
        )}
      </article>
    </PageShell>
  );
}
