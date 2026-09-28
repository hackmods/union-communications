"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import type { PersonProfile } from "@/lib/data-workbench/types";
import { filterEffectiveOn } from "@/lib/data-workbench/as-of";
import { CANONICAL_MEMBER_FIELD_IDS } from "@/lib/data-workbench/types";

const CANONICAL_FIELD_SET = new Set<string>(CANONICAL_MEMBER_FIELD_IDS);

type Props = {
  profile: PersonProfile;
  onClose: () => void;
  onOpenPerson: (personId: string) => void;
};

function formatRange(from: string | null | undefined, to: string | null | undefined, openLabel: string) {
  const start = from?.trim() || "—";
  const end = to?.trim() ? to : openLabel;
  return `${start} → ${end}`;
}

export function PersonProfilePanel({ profile, onClose, onOpenPerson }: Props) {
  const t = useTranslations("dataWorkbench");
  const openJobs = filterEffectiveOn(profile.assignments, profile.asOf);
  const closedJobs = profile.assignments.filter((job) => !openJobs.some((open) => open.id === job.id));

  return (
    <Card density="compact" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-opseu-blue">{t("personProfile")}</p>
          <CardTitle>{profile.person.displayName}</CardTitle>
          <p className="text-sm text-gray-700">
            {t("memberNumber")}: <span className="font-medium">{profile.memberNumber || "—"}</span>
            {" · "}
            {t("asOfDate")}: <span className="font-medium">{profile.asOf}</span>
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onClose}>{t("backToPeople")}</Button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t("duesStandingLabel")}</p>
          <p className="mt-1 text-base font-semibold text-opseu-dark">
            {profile.duesStanding ? t(`standing.${profile.duesStanding}` as "standing.good") : "—"}
          </p>
          <p className="mt-1 text-xs text-gray-600">{t("duesObservationalNote")}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t("duesPeriodLabel")}</p>
          <p className="mt-1 text-base font-semibold text-opseu-dark">{profile.duesPeriod || "—"}</p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t("duesSourceLabel")}</p>
          <p className="mt-1 text-base font-semibold text-opseu-dark">
            {profile.duesSource ? t(`duesSource.${profile.duesSource}` as "duesSource.employer_report") : "—"}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t("membershipStatusLabel")}</p>
          <p className="mt-1 text-base font-semibold text-opseu-dark">
            {profile.membershipStatus
              ? t(`membershipStatus.${profile.membershipStatus}` as "membershipStatus.active")
              : "—"}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t("fields.classification")}</p>
          <p className="mt-1 text-base font-semibold text-opseu-dark">
            {profile.profile.classification == null || profile.profile.classification === ""
              ? "—"
              : String(profile.profile.classification)}
          </p>
        </div>
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t("fields.hireDate")}</p>
          <p className="mt-1 text-base font-semibold text-opseu-dark">
            {profile.profile.hireDate == null || profile.profile.hireDate === ""
              ? "—"
              : String(profile.profile.hireDate)}
          </p>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-opseu-dark">{t("openJobsHeading")}</h3>
        {openJobs.length === 0 ? (
          <p className="text-sm text-gray-600">{t("noOpenJobs")}</p>
        ) : (
          <ul className="space-y-3">
            {openJobs.map((job) => (
              <li key={job.id} className="rounded-md border border-gray-200 p-3">
                <p className="font-medium text-opseu-dark">
                  {[job.jobTitle, job.employer].filter(Boolean).join(" · ") || t("unnamedJob")}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {t("positionId")}: {job.positionKey || "—"}
                  {" · "}
                  {formatRange(job.effectiveFrom, job.effectiveTo, t("stillOpen"))}
                </p>
                {(job.worksite || job.department || job.supervisorName) && (
                  <p className="mt-1 text-sm text-gray-600">
                    {[job.worksite, job.department, job.supervisorName].filter(Boolean).join(" · ")}
                  </p>
                )}
                {job.supervisorPersonId && (
                  <button
                    type="button"
                    className="mt-2 text-sm text-opseu-blue underline"
                    onClick={() => onOpenPerson(job.supervisorPersonId!)}
                  >
                    {t("openSupervisor")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-opseu-dark">{t("reportingHeading")}</h3>
        {profile.reporting.chains.length === 0 ? (
          <p className="text-sm text-gray-600">{t("noReportingChain")}</p>
        ) : (
          <ul className="space-y-3">
            {profile.reporting.chains.map((chain) => (
              <li key={chain.positionKey} className="rounded-md border border-gray-200 p-3 text-sm">
                <p className="font-medium">{chain.jobTitle || chain.positionKey}</p>
                {chain.chain.length === 0 ? (
                  <p className="mt-1 text-gray-600">{t("noSupervisorsAbove")}</p>
                ) : (
                  <ol className="mt-2 list-decimal space-y-1 pl-5">
                    {chain.chain.map((person) => (
                      <li key={person.id}>
                        <button type="button" className="text-opseu-blue underline" onClick={() => onOpenPerson(person.id)}>
                          {person.displayName}
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ul>
        )}
        {profile.reporting.directReports.length > 0 && (
          <div className="rounded-md bg-gray-50 p-3 text-sm">
            <p className="font-medium">{t("directReports")}</p>
            <ul className="mt-1 flex flex-wrap gap-2">
              {profile.reporting.directReports.map((person) => (
                <li key={person.id}>
                  <button type="button" className="text-opseu-blue underline" onClick={() => onOpenPerson(person.id)}>
                    {person.displayName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold text-opseu-dark">{t("membershipHistory")}</h3>
        {profile.memberships.length === 0 ? (
          <p className="text-sm text-gray-600">{t("noMembershipHistory")}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2">{t("memberNumber")}</th>
                  <th className="p-2">{t("effectiveFrom")}</th>
                  <th className="p-2">{t("effectiveTo")}</th>
                </tr>
              </thead>
              <tbody>
                {profile.memberships.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="p-2">{row.memberNumber}</td>
                    <td className="p-2">{row.effectiveFrom || "—"}</td>
                    <td className="p-2">{row.effectiveTo || t("stillOpen")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {closedJobs.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold text-opseu-dark">{t("closedJobsHeading")}</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {closedJobs.map((job) => (
              <li key={job.id}>
                {[job.jobTitle, job.employer].filter(Boolean).join(" · ") || job.positionKey}
                {" · "}
                {formatRange(job.effectiveFrom, job.effectiveTo, t("stillOpen"))}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="font-semibold text-opseu-dark">{t("assertionTimeline")}</h3>
        <p className="text-sm text-gray-700">{t("assertionTimelineHelp")}</p>
        {profile.assertions.length === 0 ? (
          <p className="text-sm text-gray-600">{t("noAssertions")}</p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-md border border-gray-200">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="p-2">{t("field")}</th>
                  <th className="p-2">{t("value")}</th>
                  <th className="p-2">{t("effectiveFrom")}</th>
                  <th className="p-2">{t("effectiveTo")}</th>
                  <th className="p-2">{t("recorded")}</th>
                  <th className="p-2">{t("provenance")}</th>
                </tr>
              </thead>
              <tbody>
                {profile.assertions.map((row) => (
                  <tr key={row.id} className="border-t border-gray-100 align-top">
                    <td className="p-2">{CANONICAL_FIELD_SET.has(row.fieldKey) ? t(`fields.${row.fieldKey}` as "fields.fullName") : row.fieldKey}</td>
                    <td className="max-w-48 break-words p-2">{String(row.value ?? "—")}</td>
                    <td className="p-2">{row.effectiveFrom || "—"}</td>
                    <td className="p-2">{row.effectiveTo || t("stillOpen")}</td>
                    <td className="p-2 whitespace-nowrap">{row.observedAt.slice(0, 10)}</td>
                    <td className="p-2 text-xs text-gray-600">
                      {t("rowProvenance", { row: row.rowIndex, run: row.runId.slice(0, 8) })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Card>
  );
}
