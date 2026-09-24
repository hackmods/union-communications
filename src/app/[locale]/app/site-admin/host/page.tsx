import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { buildHealthStatus } from "@/lib/ops/health-status";
import { buildHostReadiness } from "@/lib/ops/host-readiness";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HostReadinessPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/app/login`);
  const gate = await requireSiteAdminSession();
  if (!gate.ok) {
    if (gate.status === 403) redirect(`/${locale}/app`);
    redirect(`/${locale}/app/login`);
  }

  const t = await getTranslations({
    locale,
    namespace: "hub.platformOperator",
  });
  const readiness = buildHostReadiness(buildHealthStatus());

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 lg:py-12">
      <p className="text-sm">
        <Link
          href="/app/site-admin"
          className="font-medium text-opseu-blue underline underline-offset-2"
        >
          ← {t("siteAdmin")}
        </Link>
      </p>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-opseu-dark lg:text-3xl">
          {t("hostTitle")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("hostBody")}</p>
        <p
          className={cn(
            "mt-3 inline-flex rounded px-2 py-1 text-xs font-bold uppercase tracking-wide",
            readiness.ready
              ? "bg-emerald-800 text-emerald-50"
              : "bg-opseu-orange text-white",
          )}
        >
          {readiness.ready ? t("hostStatusReady") : t("hostStatusNeedsWork")}
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-opseu-gray/15 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-opseu-dark">
          {t("hostImageHeading")}
        </h2>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-opseu-gray-dark">{t("hostImageVersion")}</dt>
            <dd className="font-mono text-opseu-dark">{readiness.image.version}</dd>
          </div>
          <div>
            <dt className="text-opseu-gray-dark">{t("hostImageCommit")}</dt>
            <dd className="font-mono text-opseu-dark">
              {readiness.image.commit.slice(0, 7)}
            </dd>
          </div>
          <div>
            <dt className="text-opseu-gray-dark">{t("hostImageBuiltAt")}</dt>
            <dd className="font-mono text-opseu-dark">{readiness.image.builtAt}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 rounded-lg border border-opseu-gray/15 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-opseu-dark">
          {t("hostDbHeading")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("hostDbLead")}</p>
        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-opseu-gray-dark">{t("hostDbTip")}</dt>
            <dd className="font-mono text-opseu-dark">
              {readiness.database.tailTag ?? t("hostDbUnknown")}
              {readiness.database.tailIdx != null
                ? ` (idx ${readiness.database.tailIdx})`
                : ""}
            </dd>
          </div>
          <div>
            <dt className="text-opseu-gray-dark">{t("hostDbVerified")}</dt>
            <dd className="text-opseu-dark">
              {readiness.database.verified
                ? t("hostDbVerifiedYes", {
                    at: readiness.database.verifiedAt ?? "—",
                  })
                : t("hostDbVerifiedNo")}
            </dd>
          </div>
          <div>
            <dt className="text-opseu-gray-dark">{t("hostDbShape")}</dt>
            <dd className="font-mono text-opseu-dark">
              {readiness.database.tables != null
                ? t("hostDbShapeCounts", {
                    tables: readiness.database.tables,
                    columns: readiness.database.columns ?? 0,
                    policies: readiness.database.policies ?? 0,
                  })
                : t("hostDbUnknown")}
            </dd>
          </div>
          <div>
            <dt className="text-opseu-gray-dark">{t("hostDbMode")}</dt>
            <dd className="font-mono text-opseu-dark">{readiness.database.mode}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-opseu-gray-dark">
          {t("hostDbFlags", {
            memory: readiness.memoryCaseDataActive
              ? t("hostFlagOn")
              : t("hostFlagOff"),
            flip: readiness.postgresFlipComplete
              ? t("hostFlagOn")
              : t("hostFlagOff"),
          })}
        </p>
      </section>

      {readiness.missingBackendFlips.length > 0 ? (
        <section className="mb-8 rounded-lg border border-opseu-orange/30 bg-opseu-orange/5 p-4">
          <h2 className="text-base font-semibold text-opseu-dark">
            {t("hostMissingBackendsHeading")}
          </h2>
          <p className="mt-1 text-sm text-opseu-gray-dark">
            {t("hostMissingBackendsLead")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {readiness.missingBackendFlips.map((row) => (
              <li key={row.key}>
                <code className="text-xs">{row.key}</code>
                {" = "}
                <span className="font-medium">{row.effective}</span>
                {" → "}
                <span className="font-medium">{row.recommended}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {readiness.missingBlockingPresence.length > 0 ? (
        <section className="mb-8 rounded-lg border border-opseu-orange/30 bg-opseu-orange/5 p-4">
          <h2 className="text-base font-semibold text-opseu-dark">
            {t("hostMissingPresenceHeading")}
          </h2>
          <p className="mt-1 text-sm text-opseu-gray-dark">
            {t("hostMissingPresenceLead")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {readiness.missingBlockingPresence.map((row) => (
              <li key={row.id}>
                {t(
                  (
                    {
                      postgresConfigured: "hostPresencePostgres",
                      migrateVerified: "hostPresenceMigrate",
                      emailEnabled: "hostPresenceEmail",
                      cronConfigured: "hostPresenceCron",
                      mfaEnabled: "hostPresenceMfa",
                      demoAuthOff: "hostPresenceDemoAuth",
                    } as const
                  )[row.id],
                )}{" "}
                <code className="text-xs">({row.hintKey})</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {readiness.missingAdvisoryPresence.length > 0 ? (
        <section className="mb-8 rounded-lg border border-opseu-gray/20 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-opseu-dark">
            {t("hostMissingAdvisoryHeading")}
          </h2>
          <p className="mt-1 text-sm text-opseu-gray-dark">
            {t("hostMissingAdvisoryLead")}
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {readiness.missingAdvisoryPresence.map((row) => (
              <li key={row.id}>
                {t(
                  (
                    {
                      postgresConfigured: "hostPresencePostgres",
                      migrateVerified: "hostPresenceMigrate",
                      emailEnabled: "hostPresenceEmail",
                      cronConfigured: "hostPresenceCron",
                      mfaEnabled: "hostPresenceMfa",
                      demoAuthOff: "hostPresenceDemoAuth",
                    } as const
                  )[row.id],
                )}{" "}
                <code className="text-xs">({row.hintKey})</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-8 rounded-lg border border-opseu-gray/15 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-opseu-dark">
          {t("hostBackendsHeading")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("hostBackendsLead")}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
            <thead className="bg-opseu-gray/5 text-left text-xs uppercase tracking-wide text-opseu-gray-dark">
              <tr>
                <th className="px-3 py-2">{t("hostColKey")}</th>
                <th className="px-3 py-2">{t("hostColEffective")}</th>
                <th className="px-3 py-2">{t("hostColRecommended")}</th>
                <th className="px-3 py-2">{t("hostColStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-opseu-gray/10">
              {readiness.backends.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2 font-mono text-xs">{row.key}</td>
                  <td className="px-3 py-2">{row.effective}</td>
                  <td className="px-3 py-2">
                    {row.recommended}
                    {row.intentionalMemory ? (
                      <span className="ml-1 text-xs text-opseu-gray-dark">
                        ({t("hostIntentionalMemory")})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {row.ok ? t("hostRowOk") : t("hostRowMissing")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-opseu-gray/15 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-opseu-dark">
          {t("hostDeployHeading")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">{t("hostDeployBody")}</p>
        <p className="mt-2 text-sm text-opseu-gray-dark">{t("hostSeedNote")}</p>
      </section>
    </main>
  );
}
