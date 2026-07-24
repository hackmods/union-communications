import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { PublicPollForm } from "@/components/polls/PublicPollForm";
import { pollsStore } from "@/lib/polls/store";

/**
 * FUTURE-006 — member-facing pulse poll with consent + anonymous submit.
 */
export default async function PollPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pollPublic");
  const poll = await pollsStore.getBySlug(slug);

  if (!poll) {
    return (
      <PageShell>
        <article className="mx-auto max-w-lg space-y-4 py-10">
          <h1 className="text-2xl font-semibold text-opseu-dark">
            {t("notFoundTitle")}
          </h1>
          <p className="text-gray-700">{t("notFoundBody")}</p>
        </article>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <article className="mx-auto max-w-lg space-y-6 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-opseu-dark">
            {poll.title}
          </h1>
          <p className="text-xs text-gray-500">{t("privacyNote")}</p>
        </header>
        <PublicPollForm
          poll={poll}
          labels={{
            consent: t("consent"),
            submit: t("submit"),
            submitting: t("submitting"),
            success: t("success"),
            closed: t("closed"),
            error: t("error"),
            required: t("required"),
            freeTextPlaceholder: t("freeTextPlaceholder"),
          }}
        />
      </article>
    </PageShell>
  );
}
