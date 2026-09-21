import { auth } from "@/auth";
import { sessionMfaOk } from "@/lib/auth/mfa-policy";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { OfficerRosterBoard } from "@/components/hub/OfficerRosterBoard";
import { resolveAuthorizationActor } from "@/lib/authorization/resolve-actor";
import { decideCapability } from "@/lib/authorization/model";
import { OrganizationManager } from "@/components/hub/OrganizationManager";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export default async function OfficersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "organization" });
  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  if (!sessionMfaOk(session)) redirect(`/${locale}/app/mfa`);
  const actor = await resolveAuthorizationActor(session);
  if (!actor.accountActive) redirect(`/${locale}/app/login`);
  const localId = session.user.localId;
  const canManageOffices = Boolean(session.user.unionId && localId && decideCapability(
    actor,
    "officers.manage",
    { unionId: session.user.unionId, localId },
  ).allowed);
  if (!canManageOffices) {
    redirect(`/${locale}/app`);
  }
  if (actor.source === "database") {
    if (!localId) redirect(`/${locale}/app`);
    return <OrganizationManager localId={localId} />;
  }
  return (
    <div className="space-y-6">
      {canManageOffices && localId ? (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h1 className="font-semibold text-opseu-dark">{t("manageTitle")}</h1>
          <p className="mt-1 text-sm text-gray-700">{t("manageHint")}</p>
          <Link className="mt-3 inline-flex min-h-10 items-center rounded-md bg-opseu-blue px-4 font-semibold text-white" href="/app/organization">
            {t("manageLink")}
          </Link>
        </section>
      ) : null}
      <OfficerRosterBoard />
    </div>
  );
}
