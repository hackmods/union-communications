import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/PageShell";
import { PublicRsvpForm } from "@/components/meetings/PublicRsvpForm";
import { meetingsRsvpStore } from "@/lib/meetings/rsvp-store";

/**
 * Calendar R1 — public tokenized RSVP form (not a member portal).
 * Date/time/location + attending + join mode; no login, no grievance data.
 */
export default async function PublicRsvpPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("rsvpPublic");
  const resolved = await meetingsRsvpStore.resolvePublicToken(token);

  if (!resolved) {
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

  const { meeting } = resolved;

  return (
    <PageShell>
      <article className="mx-auto max-w-lg space-y-6 py-10">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-opseu-dark">
            {meeting.title}
          </h1>
          <p className="text-sm text-gray-700">
            {new Date(meeting.startsAt).toLocaleString(locale)}
            {" · "}
            {meeting.location}
          </p>
          {meeting.publicBlurb && (
            <p className="text-sm text-gray-600">{meeting.publicBlurb}</p>
          )}
          <p className="text-xs text-gray-500">{t("privacyNote")}</p>
        </header>
        <PublicRsvpForm
          token={token}
          meeting={meeting}
          labels={{
            attending: t("attending"),
            attendingYes: t("attendingYes"),
            attendingMaybe: t("attendingMaybe"),
            attendingNo: t("attendingNo"),
            joinMode: t("joinMode"),
            onSite: t("onSite"),
            remote: t("remote"),
            displayName: t("displayName"),
            email: t("email"),
            phone: t("phone"),
            guests: t("guests"),
            dietary: t("dietary"),
            accessibility: t("accessibility"),
            roleOrOffice: t("roleOrOffice"),
            consent: t("consent"),
            submit: t("submit"),
            submitting: t("submitting"),
            success: t("success"),
            closed: t("closed"),
            error: t("error"),
            required: t("required"),
          }}
        />
      </article>
    </PageShell>
  );
}
