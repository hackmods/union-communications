"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { LocalLifecycleActions } from "@/components/site-admin/LocalLifecycleActions";
import { LocalOfficerMfaToggle } from "@/components/site-admin/LocalOfficerMfaToggle";
import { MoveLocalPanel } from "@/components/site-admin/MoveLocalPanel";
import {
  OrganizationStatusFilter,
  type StatusFilter,
} from "@/components/site-admin/OrganizationStatusFilter";

export type LocalAdminRow = {
  id: string;
  localNumber: string;
  subText: string;
  divisionId: string | null;
  archivedAt: Date | null;
  isDemo: boolean;
  empty: boolean;
  mfaRequired: boolean;
};

type CollectiveOption = { id: string; name: string };

type Props = {
  unionId: string;
  rows: LocalAdminRow[];
  collectives: CollectiveOption[];
  collectiveNameById: Map<string, string>;
  /** Host has MIGRATE_DATABASE_URL (required for cross-union move). */
  ownerDbReady?: boolean;
  /** Create-local form (and related) rendered under the inventory. */
  footer?: ReactNode;
};

/**
 * Locals inventory: status filter, card stack on small screens, table from md up.
 * Move Local opens a full-width panel under the inventory (desktop + mobile).
 */
export function LocalsAdminPanel({
  unionId,
  rows,
  collectives,
  collectiveNameById,
  ownerDbReady = true,
  footer,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [movingLocalId, setMovingLocalId] = useState<string | null>(null);
  const movePanelRef = useRef<HTMLDivElement | null>(null);

  const archivedCount = rows.filter((row) => row.archivedAt).length;
  const activeCount = rows.length - archivedCount;
  const activeRows = rows.filter((row) => !row.archivedAt);
  const movingRow = movingLocalId
    ? (rows.find((row) => row.id === movingLocalId) ?? null)
    : null;

  useEffect(() => {
    if (!movingLocalId) return;
    const panel = movePanelRef.current;
    if (!panel) return;
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const heading = panel.querySelector<HTMLElement>("#local-move-heading");
    heading?.focus({ preventScroll: true });
  }, [movingLocalId]);

  const visible = useMemo(() => {
    return rows.filter((row) => {
      if (filter === "active") return !row.archivedAt;
      if (filter === "archived") return Boolean(row.archivedAt);
      return true;
    });
  }, [rows, filter]);

  function lifecycleProps(row: LocalAdminRow, collectiveName: string | null) {
    return {
      localId: row.id,
      localNumber: row.localNumber,
      subText: row.subText,
      divisionId: row.divisionId,
      archived: Boolean(row.archivedAt),
      empty: row.empty,
      collectives,
      orphanCollectiveName: collectiveName,
      deleteBlockedReason:
        row.archivedAt && !row.empty ? t("localDeleteBlocked") : null,
      onMove: () => setMovingLocalId(row.id),
    };
  }

  return (
    <section id="organization-locals" className="mt-6 scroll-mt-28">
      <header className="mb-3">
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("localsPanelTitle")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("localsPanelBody")}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-md border border-opseu-gray/15 bg-white px-3 py-4 text-center text-sm text-opseu-gray-dark">
          {t("localsNoneActive")}
        </p>
      ) : (
        <>
          <div className="mb-3">
            <OrganizationStatusFilter
              filter={filter}
              onChange={setFilter}
              label={t("unionsFilterLabel")}
              allLabel={t("unionsFilterAll", { count: rows.length })}
              activeLabel={t("unionsFilterActive", { count: activeCount })}
              archivedLabel={t("unionsFilterArchived", {
                count: archivedCount,
              })}
            />
          </div>

          {visible.length === 0 ? (
            <p className="rounded-md border border-opseu-gray/15 bg-opseu-gray/5 px-3 py-4 text-sm text-opseu-gray-dark">
              {t("localsFilterEmpty")}
            </p>
          ) : (
            <>
              <ul className="space-y-3 md:hidden">
                {visible.map((row) => {
                  const collectiveName = row.divisionId
                    ? (collectiveNameById.get(row.divisionId) ?? null)
                    : null;
                  const isMoving = movingLocalId === row.id;
                  return (
                    <li
                      key={row.id}
                      className={
                        isMoving
                          ? "rounded-md border border-opseu-blue/40 bg-opseu-blue/5 p-3 ring-2 ring-opseu-blue/30"
                          : "rounded-md border border-opseu-gray/15 bg-white p-3"
                      }
                      aria-current={isMoving ? "true" : undefined}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-mono text-sm font-semibold text-opseu-dark">
                          {row.localNumber}
                        </p>
                        <p className="text-xs text-opseu-gray-dark">
                          {row.archivedAt
                            ? t("unionsStatusArchived")
                            : t("unionsStatusActive")}
                        </p>
                      </div>
                      {isMoving ? (
                        <p className="mt-1 text-xs font-medium text-opseu-blue">
                          {t("localMoveRowActive")}
                        </p>
                      ) : null}
                      <dl className="mt-2 space-y-1 text-sm text-opseu-gray-dark">
                        <div>
                          <dt className="inline font-medium text-opseu-dark">
                            {t("localsColSubline")}:{" "}
                          </dt>
                          <dd className="inline">{row.subText || "—"}</dd>
                        </div>
                        <div>
                          <dt className="inline font-medium text-opseu-dark">
                            {t("localsColCollective")}:{" "}
                          </dt>
                          <dd className="inline">{collectiveName ?? "—"}</dd>
                        </div>
                        <div>
                          <dt className="inline font-medium text-opseu-dark">
                            {t("localsColOfficerMfa")}:{" "}
                          </dt>
                          <dd className="mt-1 block">
                            <LocalOfficerMfaToggle
                              localId={row.id}
                              mfaRequired={row.mfaRequired}
                              archived={Boolean(row.archivedAt)}
                            />
                          </dd>
                        </div>
                        {row.isDemo ? (
                          <div>
                            <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-xs text-opseu-orange-dark">
                              {t("usersDemoBadge")}
                            </span>
                          </div>
                        ) : null}
                      </dl>
                      <div className="mt-3 border-t border-opseu-gray/10 pt-3">
                        <LocalLifecycleActions
                          {...lifecycleProps(row, collectiveName)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="hidden overflow-x-auto rounded-md border border-opseu-gray/15 bg-white md:block">
                <table className="min-w-full divide-y divide-opseu-gray/15 text-sm">
                  <thead className="bg-opseu-gray/5 text-left text-xs uppercase text-opseu-gray-dark">
                    <tr>
                      <th className="px-3 py-2">{t("localsColNumber")}</th>
                      <th className="px-3 py-2">{t("localsColSubline")}</th>
                      <th className="px-3 py-2">{t("localsColCollective")}</th>
                      <th className="px-3 py-2">{t("localsColOfficerMfa")}</th>
                      <th className="px-3 py-2">{t("localsColDemo")}</th>
                      <th className="px-3 py-2">{t("localsColArchived")}</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-opseu-gray/10">
                    {visible.map((row) => {
                      const collectiveName = row.divisionId
                        ? (collectiveNameById.get(row.divisionId) ?? null)
                        : null;
                      const isMoving = movingLocalId === row.id;
                      return (
                        <tr
                          key={row.id}
                          className={
                            isMoving ? "bg-opseu-blue/5" : undefined
                          }
                          aria-current={isMoving ? "true" : undefined}
                        >
                          <td className="px-3 py-2 font-mono text-xs text-opseu-dark">
                            {row.localNumber}
                            {isMoving ? (
                              <span className="mt-1 block text-[0.65rem] font-sans font-medium normal-case tracking-normal text-opseu-blue">
                                {t("localMoveRowActive")}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-opseu-gray-dark">
                            {row.subText || "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-opseu-gray-dark">
                            {collectiveName ?? "—"}
                          </td>
                          <td className="px-3 py-2">
                            <LocalOfficerMfaToggle
                              localId={row.id}
                              mfaRequired={row.mfaRequired}
                              archived={Boolean(row.archivedAt)}
                            />
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.isDemo ? (
                              <span className="rounded bg-opseu-orange/20 px-2 py-0.5 text-opseu-orange-dark">
                                {t("usersDemoBadge")}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {row.archivedAt
                              ? row.archivedAt.toISOString().slice(0, 10)
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <LocalLifecycleActions
                              {...lifecycleProps(row, collectiveName)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {movingRow ? (
            <div
              ref={movePanelRef}
              className="mt-4 rounded-md border border-opseu-gray/15 bg-white p-4"
            >
              <MoveLocalPanel
                key={movingRow.id}
                localId={movingRow.id}
                localNumber={movingRow.localNumber}
                currentUnionId={unionId}
                archived={Boolean(movingRow.archivedAt)}
                ownerDbReady={ownerDbReady}
                onCancel={() => setMovingLocalId(null)}
              />
            </div>
          ) : null}

          {activeRows.length === 0 ? (
            <p className="mt-2 text-sm text-opseu-gray-dark">
              {t("localsOnlyArchived")}
            </p>
          ) : null}
        </>
      )}

      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
