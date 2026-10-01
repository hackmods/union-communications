"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type CollectiveOption = { id: string; unionId: string; name: string };
type UnionOption = { id: string; name: string };

type PreviewBlock = { code: string; detail?: string };
type PreviewWarning = { code: string; detail?: string };

type PreviewPayload = {
  fromUnionId: string;
  toUnionId: string;
  fromUnionName: string;
  toUnionName: string;
  localNumber: string;
  effectiveLocalNumber: string;
  fromIsDemo: boolean;
  toIsDemo: boolean;
  fromMembershipPolicy: string;
  toMembershipPolicy: string;
  counts: {
    usersPrimary: number;
    memberships: number;
    invites: number;
    bargainingUnits: number;
    caseworkRows: number;
    portalCircles: number;
    tablesWithRows: number;
  };
  blocks: PreviewBlock[];
  warnings: PreviewWarning[];
  conflictingUserIds: string[];
  canMove: boolean;
};

type Props = {
  localId: string;
  localNumber: string;
  currentUnionId: string;
  archived?: boolean;
  /** When false, show owner-DB host banner and disable actions. */
  ownerDbReady?: boolean;
  stackActions?: boolean;
  onCancel: () => void;
};

/**
 * Site Admin Move Local panel — preview impact, confirm, MFA, commit.
 */
export function MoveLocalPanel({
  localId,
  localNumber,
  currentUnionId,
  archived = false,
  ownerDbReady = true,
  stackActions = false,
  onCancel,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [unions, setUnions] = useState<UnionOption[]>([]);
  const [collectives, setCollectives] = useState<CollectiveOption[]>([]);
  const [unionsLoadState, setUnionsLoadState] = useState<
    "loading" | "ready" | "empty" | "error"
  >("loading");
  const [unionQuery, setUnionQuery] = useState("");
  const [toUnionId, setToUnionId] = useState("");
  const [toDivisionId, setToDivisionId] = useState("");
  const [renameNumber, setRenameNumber] = useState("");
  const [confirmNumber, setConfirmNumber] = useState("");
  const [acknowledgeWarnings, setAcknowledgeWarnings] = useState(false);
  const [endOtherMemberships, setEndOtherMemberships] = useState(false);
  const [allowDemoMismatch, setAllowDemoMismatch] = useState(false);
  const [preview, setPreview] = useState<PreviewPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [stepUp, setStepUp] = useState(false);
  const [resultUnconfirmed, setResultUnconfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"preview" | "commit" | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setUnionsLoadState("loading");
      try {
        const res = await fetch("/api/site-admin/tenant-options");
        if (!res.ok) {
          if (!cancelled) setUnionsLoadState("error");
          return;
        }
        const data = (await res.json()) as {
          unions: UnionOption[];
          collectives?: CollectiveOption[];
        };
        if (cancelled) return;
        const dest = data.unions.filter((u) => u.id !== currentUnionId);
        setUnions(dest);
        setCollectives(data.collectives ?? []);
        setUnionsLoadState(dest.length === 0 ? "empty" : "ready");
      } catch {
        if (!cancelled) setUnionsLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUnionId]);

  const filteredUnions = useMemo(() => {
    const q = unionQuery.trim().toLowerCase();
    if (!q) return unions;
    return unions.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q),
    );
  }, [unions, unionQuery]);

  const destinationCollectives = useMemo(
    () => collectives.filter((c) => c.unionId === toUnionId),
    [collectives, toUnionId],
  );

  const showEndOther =
    Boolean(preview?.blocks.some((b) => b.code === "single_local_conflict")) ||
    endOtherMemberships;
  const showDemoMismatch =
    Boolean(preview?.blocks.some((b) => b.code === "demo_mismatch")) ||
    Boolean(preview?.warnings.some((w) => w.code === "demo_mismatch_ack")) ||
    allowDemoMismatch;

  const shellClass = stackActions
    ? "flex w-full flex-col items-stretch gap-2"
    : "flex w-full max-w-2xl flex-col items-stretch gap-2 md:items-start";
  const actionRowClass = stackActions
    ? "flex w-full flex-col gap-2"
    : "flex w-full flex-wrap gap-2 md:justify-start";
  const actionBtnClass = stackActions ? "min-h-11 w-full" : "min-h-11";
  const helpClass = "text-xs text-opseu-gray-dark";

  function mapError(code: string | undefined, fallback: string): string {
    if (code === "mfa_step_up_required") return t("localActionStepUpRequired");
    if (code === "mfa_step_up_failed") return t("localActionStepUpFailed");
    if (code === "mfa_step_up_limited") return t("localActionStepUpLimited");
    if (
      code === "mfa_step_up_unavailable" ||
      code === "audit_unavailable"
    ) {
      return t("localActionStepUpUnavailable");
    }
    if (code === "local_move_result_unconfirmed") {
      return t("localActionResultUnconfirmed");
    }
    if (code === "number_taken") return t("localMoveNumberTaken");
    if (code === "owner_db_required") return t("localMoveOwnerDbRequired");
    if (code === "postgres_required") return t("localMovePostgresRequired");
    if (code === "already_there") return t("localMoveAlreadyThere");
    if (code === "concurrent_change") return t("localMoveConcurrentChange");
    if (code === "destination_archived") return t("localMoveDestinationArchived");
    if (code === "destination_not_found") return t("localMoveDestinationNotFound");
    if (code === "local_not_found") return t("localMoveLocalNotFound");
    if (code === "number_required") return t("localMoveNumberRequired");
    if (code === "demo_mismatch") return t("localMoveDemoMismatch");
    if (code === "single_local_conflict") {
      return t("localMoveSingleLocalConflict");
    }
    if (code === "data_identifier_collision") {
      return t("localMoveDataIdentifierCollision");
    }
    if (code === "officer_learning_collision") {
      return t("localMoveOfficerLearningCollision");
    }
    if (code === "confirm_mismatch") return t("localMoveConfirmMismatch");
    if (code === "warnings_unacknowledged") {
      return t("localMoveWarningsUnacknowledged");
    }
    if (code === "division_invalid") return t("localMoveDivisionInvalid");
    if (code === "cascade_failed") return t("localMoveCascadeFailed");
    return fallback;
  }

  function blockLabel(block: PreviewBlock): string {
    if (block.code === "single_local_conflict" && block.detail) {
      return t("localMoveSingleLocalConflictCount", { count: block.detail });
    }
    return mapError(block.code, block.code);
  }

  function warningLabel(warning: PreviewWarning): string {
    if (warning.code === "casework_present") {
      return t("localMoveWarningCasework", { count: warning.detail ?? "0" });
    }
    if (warning.code === "invites_present") {
      return t("localMoveWarningInvites", { count: warning.detail ?? "0" });
    }
    if (warning.code === "modules_differ") return t("localMoveWarningModules");
    if (warning.code === "collective_cleared") {
      return t("localMoveWarningCollectiveCleared");
    }
    if (warning.code === "demo_mismatch_ack") {
      return t("localMoveWarningDemoAck");
    }
    if (warning.code === "archived_local") {
      return t("localMoveWarningArchived");
    }
    return warning.code;
  }

  async function run(action: "preview" | "commit", code?: string) {
    setBusy(true);
    setBusyAction(action);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        toUnionId,
        toDivisionId: toDivisionId.trim() || null,
        ...(renameNumber.trim()
          ? { localNumber: renameNumber.trim() }
          : {}),
        endOtherMembershipsInDestination: endOtherMemberships,
        allowDemoMismatch,
        ...(action === "commit" && code ? { mfaCode: code } : {}),
      };
      if (action === "commit") {
        body.confirmLocalNumber = confirmNumber.trim();
        body.acknowledgeWarnings = acknowledgeWarnings;
      }

      const path =
        action === "preview"
          ? `/api/site-admin/locals/${encodeURIComponent(localId)}/move/preview`
          : `/api/site-admin/locals/${encodeURIComponent(localId)}/move`;

      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        preview?: PreviewPayload;
        move?: { toUnionId: string; localNumber: string };
      };

      if (!response.ok) {
        if (action === "commit" && data.code?.startsWith("mfa_step_up_")) {
          setStepUp(true);
          setError(mapError(data.code, data.error ?? t("localMoveFailed")));
          if (data.code !== "mfa_step_up_required") setMfaCode("");
          return;
        }
        if (data.code === "local_move_result_unconfirmed") {
          setResultUnconfirmed(true);
        }
        setError(mapError(data.code, data.error ?? t("localMoveFailed")));
        return;
      }

      setStepUp(false);
      setMfaCode("");

      if (action === "preview" && data.preview) {
        setPreview(data.preview);
        if (data.preview.warnings.length > 0) {
          setAcknowledgeWarnings(false);
        }
        return;
      }

      if (action === "commit" && data.move) {
        setSuccess(
          t("localMoveSuccess", {
            number: data.move.localNumber,
            union: preview?.toUnionName ?? data.move.toUnionId,
          }),
        );
        router.refresh();
      }
    } catch {
      setResultUnconfirmed(true);
      setError(t("localActionResultUnconfirmed"));
    } finally {
      setBusy(false);
      setBusyAction(null);
    }
  }

  const busyLabel =
    busyAction === "commit"
      ? t("localMoveCommitting")
      : busyAction === "preview"
        ? t("localMovePreviewing")
        : t("localMoveWorking");

  if (success && preview) {
    return (
      <div className={shellClass} data-testid="local-move-success">
        <Callout tone="success" role="status" className="w-full p-3 text-sm">
          <p className="font-semibold">{t("localMoveSuccessTitle")}</p>
          <p className="mt-1">{success}</p>
          <div className="mt-2">
            <Link
              href={`/app/site-admin/organization/${encodeURIComponent(preview.toUnionId)}`}
              className="font-medium text-opseu-blue underline-offset-2 hover:underline"
            >
              {t("localMoveOpenDestination")}
            </Link>
          </div>
        </Callout>
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          onClick={onCancel}
        >
          {t("localActionCancel")}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={shellClass}
      data-testid="local-move-panel"
      aria-labelledby="local-move-heading"
    >
      <h3
        id="local-move-heading"
        tabIndex={-1}
        className="text-sm font-semibold text-opseu-dark outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/40"
      >
        {t("localMoveHeading", { number: localNumber })}
      </h3>
      <p className={helpClass}>{t("localMoveHelp")}</p>
      {stepUp || preview?.canMove ? (
        <p className={helpClass}>{t("localMoveMfaNote")}</p>
      ) : null}

      {!ownerDbReady ? (
        <Callout tone="warning" role="status" className="w-full p-3 text-sm">
          <p className="font-semibold">{t("localMoveOwnerDbBannerTitle")}</p>
          <p className="mt-1">{t("localMoveOwnerDbRequired")}</p>
        </Callout>
      ) : null}

      {archived ? (
        <Callout tone="warning" role="status" className="w-full p-3 text-sm">
          {t("localMoveWarningArchived")}
        </Callout>
      ) : null}

      {error ? (
        <Callout tone="danger" role="alert" className="w-full p-3 text-sm">
          <p className="font-semibold">{t("localMoveErrorTitle")}</p>
          <p className="mt-1">{error}</p>
          {resultUnconfirmed ? (
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                className={actionBtnClass}
                onClick={() => window.location.reload()}
              >
                {t("localActionReload")}
              </Button>
            </div>
          ) : null}
        </Callout>
      ) : null}

      {stepUp ? (
        <form
          className="flex w-full flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run("commit", mfaCode);
          }}
        >
          <Input
            label={t("localActionMfaCode")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={32}
            autoFocus
            required
            disabled={busy}
            className="min-h-11"
          />
          <p className={helpClass}>{t("localActionStepUpHelp")}</p>
          <div className={actionRowClass}>
            <Button
              type="button"
              variant="outline"
              className={actionBtnClass}
              disabled={busy}
              onClick={() => {
                setStepUp(false);
                setMfaCode("");
              }}
            >
              {t("localActionCancelStepUp")}
            </Button>
            <Button
              type="submit"
              className={actionBtnClass}
              disabled={busy || !mfaCode.trim()}
            >
              {busy ? busyLabel : t("localActionConfirm")}
            </Button>
          </div>
        </form>
      ) : (
        <form
          className="flex w-full flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (preview?.canMove) {
              void run("commit");
            } else {
              void run("preview");
            }
          }}
        >
          {unionsLoadState === "loading" ? (
            <p className={helpClass}>{t("localMoveUnionsLoading")}</p>
          ) : null}
          {unionsLoadState === "error" ? (
            <Callout tone="danger" className="w-full p-3 text-sm" role="alert">
              {t("localMoveUnionsLoadFailed")}
            </Callout>
          ) : null}
          {unionsLoadState === "empty" ? (
            <Callout tone="warning" className="w-full p-3 text-sm" role="status">
              {t("localMoveUnionsEmpty")}
            </Callout>
          ) : null}

          <Input
            label={t("localMoveUnionSearch")}
            value={unionQuery}
            onChange={(event) => setUnionQuery(event.target.value)}
            disabled={busy || resultUnconfirmed || !ownerDbReady}
            className="min-h-11"
            placeholder={t("localMoveUnionSearchPlaceholder")}
          />

          <Select
            label={t("localMoveDestinationUnion")}
            value={toUnionId}
            disabled={
              busy ||
              resultUnconfirmed ||
              !ownerDbReady ||
              unionsLoadState !== "ready"
            }
            onChange={(event) => {
              setToUnionId(event.target.value);
              setToDivisionId("");
              setPreview(null);
            }}
            required
          >
            <option value="">{t("localMoveDestinationUnionPlaceholder")}</option>
            {filteredUnions.map((union) => (
              <option key={union.id} value={union.id}>
                {union.name}
              </option>
            ))}
          </Select>
          {unionQuery.trim() && filteredUnions.length === 0 ? (
            <p className={helpClass}>{t("localMoveUnionSearchEmpty")}</p>
          ) : null}

          <Select
            label={t("localMoveDestinationCollective")}
            value={toDivisionId}
            disabled={busy || resultUnconfirmed || !toUnionId || !ownerDbReady}
            onChange={(event) => {
              setToDivisionId(event.target.value);
              setPreview(null);
            }}
          >
            <option value="">{t("localMoveDestinationCollectiveNone")}</option>
            {destinationCollectives.map((collective) => (
              <option key={collective.id} value={collective.id}>
                {collective.name}
              </option>
            ))}
          </Select>

          <Input
            label={t("localMoveRenameNumber")}
            value={renameNumber}
            onChange={(event) => {
              setRenameNumber(event.target.value);
              setPreview(null);
            }}
            disabled={busy || resultUnconfirmed || !ownerDbReady}
            className="min-h-11 font-mono"
            placeholder={localNumber}
          />
          <p className={helpClass}>{t("localMoveRenameHelp")}</p>

          {showEndOther ? (
            <Checkbox
              checked={endOtherMemberships}
              disabled={busy || resultUnconfirmed || !ownerDbReady}
              onChange={(event) => {
                setEndOtherMemberships(event.target.checked);
                setPreview(null);
              }}
              label={t("localMoveEndOtherMemberships")}
            />
          ) : null}
          {showDemoMismatch ? (
            <Checkbox
              checked={allowDemoMismatch}
              disabled={busy || resultUnconfirmed || !ownerDbReady}
              onChange={(event) => {
                setAllowDemoMismatch(event.target.checked);
                setPreview(null);
              }}
              label={t("localMoveAllowDemoMismatch")}
            />
          ) : null}

          {preview ? (
            <div
              className="w-full rounded-md border border-opseu-gray/15 bg-opseu-gray/5 p-3 text-sm text-opseu-gray-dark"
              aria-live="polite"
              data-testid="local-move-preview"
            >
              <p className="font-semibold text-opseu-dark">
                {t("localMovePreviewTitle")}
              </p>
              <p className="mt-2 text-opseu-dark">
                {t("localMovePreviewHeadline", {
                  number: preview.localNumber,
                  from: preview.fromUnionName,
                  to: preview.toUnionName,
                })}
              </p>
              {preview.effectiveLocalNumber !== preview.localNumber ? (
                <p className="mt-1">
                  {t("localMovePreviewRename", {
                    number: preview.effectiveLocalNumber,
                  })}
                </p>
              ) : null}
              <ul className="mt-2 space-y-1 text-xs">
                <li>
                  {t("localMovePreviewUsers", {
                    count: preview.counts.usersPrimary,
                  })}
                </li>
                <li>
                  {t("localMovePreviewMemberships", {
                    count: preview.counts.memberships,
                  })}
                </li>
                <li>
                  {t("localMovePreviewInvites", {
                    count: preview.counts.invites,
                  })}
                </li>
                <li>
                  {t("localMovePreviewCollections", {
                    count: preview.counts.bargainingUnits,
                  })}
                </li>
                <li>
                  {t("localMovePreviewCasework", {
                    count: preview.counts.caseworkRows,
                  })}
                </li>
                <li>
                  {t("localMovePreviewPortal", {
                    count: preview.counts.portalCircles,
                  })}
                </li>
              </ul>
              {preview.blocks.length > 0 ? (
                <Callout tone="danger" className="mt-2 p-2 text-xs" role="alert">
                  <p className="font-semibold">{t("localMoveBlockedTitle")}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {preview.blocks.map((block) => (
                      <li key={block.code}>{blockLabel(block)}</li>
                    ))}
                  </ul>
                  {preview.conflictingUserIds.length > 0 ? (
                    <p className="mt-2">
                      {t("localMoveConflictMembers", {
                        count: String(preview.conflictingUserIds.length),
                      })}
                    </p>
                  ) : null}
                  <p className="mt-2">{t("localMoveEscapeHelp")}</p>
                  <Link
                    href={`/app/site-admin/organization/${encodeURIComponent(toUnionId)}#organization-create-local`}
                    className="mt-1 inline-block font-medium text-opseu-blue underline-offset-2 hover:underline"
                  >
                    {t("localMoveEscapeCta")}
                  </Link>
                </Callout>
              ) : null}
              {preview.warnings.length > 0 ? (
                <div className="mt-2">
                  <p className="font-semibold text-opseu-dark">
                    {t("localMoveWarningsTitle")}
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4 text-xs">
                    {preview.warnings.map((warning) => (
                      <li key={warning.code}>{warningLabel(warning)}</li>
                    ))}
                  </ul>
                  <div className="mt-2">
                    <Checkbox
                      checked={acknowledgeWarnings}
                      disabled={busy || resultUnconfirmed}
                      onChange={(event) =>
                        setAcknowledgeWarnings(event.target.checked)
                      }
                      label={t("localMoveAcknowledgeWarnings")}
                    />
                  </div>
                </div>
              ) : null}
              {preview.canMove ? (
                <>
                  <Input
                    label={t("localMoveConfirmLabel")}
                    value={confirmNumber}
                    onChange={(event) => setConfirmNumber(event.target.value)}
                    required
                    disabled={busy || resultUnconfirmed}
                    className="mt-2 min-h-11 font-mono"
                    autoComplete="off"
                  />
                  <p className={helpClass}>{t("localMoveConfirmHelp")}</p>
                </>
              ) : null}
            </div>
          ) : null}

          <div className={actionRowClass}>
            <Button
              type="button"
              variant="outline"
              className={actionBtnClass}
              disabled={busy}
              onClick={onCancel}
            >
              {t("localActionCancel")}
            </Button>
            {preview ? (
              <Button
                type="button"
                variant="outline"
                className={actionBtnClass}
                disabled={busy || resultUnconfirmed || !toUnionId || !ownerDbReady}
                onClick={() => void run("preview")}
              >
                {busy ? busyLabel : t("localMoveRefreshPreview")}
              </Button>
            ) : null}
            {preview?.canMove ? (
              <Button
                type="submit"
                className={actionBtnClass}
                disabled={
                  busy ||
                  resultUnconfirmed ||
                  !ownerDbReady ||
                  confirmNumber.trim() !== localNumber ||
                  (preview.warnings.length > 0 && !acknowledgeWarnings)
                }
              >
                {busy ? busyLabel : t("localMoveCommit")}
              </Button>
            ) : (
              <Button
                type="submit"
                className={actionBtnClass}
                disabled={
                  busy ||
                  resultUnconfirmed ||
                  !toUnionId ||
                  !ownerDbReady ||
                  unionsLoadState !== "ready"
                }
              >
                {busy ? busyLabel : t("localMovePreview")}
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
