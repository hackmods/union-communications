import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireSiteAdminSession } from "@/lib/auth/site-admin-session";
import { isPostgresConfigured } from "@/lib/db/client";
import { scanMembershipIntegrity } from "@/lib/site-admin/membership-integrity";

export const dynamic = "force-dynamic";

export default async function MembershipIntegrityPage({
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

  let issues: Awaited<ReturnType<typeof scanMembershipIntegrity>>["issues"] =
    [];
  let highCount = 0;
  if (isPostgresConfigured()) {
    try {
      const result = await scanMembershipIntegrity();
      issues = result.issues;
      highCount = result.highCount;
    } catch {
      issues = [];
    }
  }

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
          {t("membershipIntegrity")}
        </h1>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("membershipIntegrityBody")}
        </p>
        <p className="mt-2 text-sm text-opseu-gray-dark">
          {t("membershipIntegritySummary", {
            total: issues.length,
            high: highCount,
          })}
        </p>
      </header>

      {!isPostgresConfigured() ? (
        <p className="rounded-md border border-opseu-orange/30 bg-opseu-orange/5 p-4 text-sm">
          {t("membershipIntegrityNeedsPostgres")}
        </p>
      ) : issues.length === 0 ? (
        <p className="text-sm text-opseu-gray-dark">
          {t("membershipIntegrityEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-opseu-gray/15 bg-white">
          <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
            <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
              <tr>
                <th className="px-3 py-2">{t("integrityColSeverity")}</th>
                <th className="px-3 py-2">{t("integrityColCode")}</th>
                <th className="px-3 py-2">{t("integrityColDetail")}</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-opseu-gray/10">
              {issues.map((issue, idx) => (
                <tr key={`${issue.code}-${issue.userId ?? issue.localId ?? idx}`}>
                  <td className="px-3 py-2">
                    <span
                      className={
                        issue.severity === "high"
                          ? "rounded bg-opseu-orange/20 px-2 py-0.5 text-xs text-opseu-orange-dark"
                          : issue.severity === "medium"
                            ? "rounded bg-opseu-blue/10 px-2 py-0.5 text-xs text-opseu-blue"
                            : "text-xs text-opseu-gray-dark"
                      }
                    >
                      {issue.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{issue.code}</td>
                  <td className="px-3 py-2 text-opseu-gray-dark">
                    {issue.detail}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {issue.userId ? (
                      <Link
                        href={`/app/site-admin/account-support/${encodeURIComponent(issue.userId)}`}
                        className="text-opseu-blue hover:underline"
                      >
                        {t("integrityOpenUser")}
                      </Link>
                    ) : issue.unionId ? (
                      <Link
                        href={`/app/site-admin/locals/${encodeURIComponent(issue.unionId)}`}
                        className="text-opseu-blue hover:underline"
                      >
                        {t("integrityOpenLocal")}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
