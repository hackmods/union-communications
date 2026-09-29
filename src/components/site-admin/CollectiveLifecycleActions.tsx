"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";

type Props = {
  collectiveId: string;
  code: string;
  name: string;
  archived: boolean;
  empty: boolean;
  deleteBlockedReason?: string | null;
  /** Full-width stacked actions (mobile cards). */
  stackActions?: boolean;
};

type Mode = "idle" | "edit" | "delete" | "stepUp";

/**
 * Edit / archive / restore / empty-delete for a bargaining collective row.
 */
export function CollectiveLifecycleActions({
  collectiveId,
  code,
  name,
  archived,
  empty,
  deleteBlockedReason = null,
  stackActions = false,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [pendingAction, setPendingAction] = useState<
    "archive" | "restore" | "edit" | "delete" | null
  >(null);
  const [mfaCode, setMfaCode] = useState("");
  const [codeValue, setCodeValue] = useState(code);
  const [nameValue, setNameValue] = useState(name);
  const [confirmCode, setConfirmCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultUnconfirmed, setResultUnconfirmed] = useState(false);

  function mapError(codeKey: string | undefined, fallback: string): string {
    if (codeKey === "mfa_step_up_required")
      return t("collectiveActionStepUpRequired");
    if (codeKey === "mfa_step_up_failed")
      return t("collectiveActionStepUpFailed");
    if (codeKey === "mfa_step_up_limited")
      return t("collectiveActionStepUpLimited");
    if (
      codeKey === "mfa_step_up_unavailable" ||
      codeKey === "audit_unavailable" ||
      codeKey === "collective_action_audit_unavailable"
    ) {
      return t("collectiveActionStepUpUnavailable");
    }
    if (
      codeKey === "collective_update_result_unconfirmed" ||
      codeKey === "collective_delete_result_unconfirmed" ||
      codeKey === "collective_action_outcome_unconfirmed"
    ) {
      return t("collectiveActionResultUnconfirmed");
    }
    if (codeKey === "code_taken") return t("collectiveEditCodeTaken");
    if (codeKey === "not_empty") return t("collectiveDeleteNotEmpty");
    if (codeKey === "archive_required")
      return t("collectiveDeleteArchiveRequired");
    if (codeKey === "confirm_mismatch")
      return t("collectiveDeleteConfirmMismatch");
    return fallback;
  }

  async function run(
    action: "archive" | "restore" | "edit" | "delete",
    stepCode?: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      let response: Response;
      if (action === "archive" || action === "restore") {
        response = await fetch(
          `/api/site-admin/collectives/${encodeURIComponent(collectiveId)}/${action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(stepCode ? { mfaCode: stepCode } : {}),
          },
        );
      } else if (action === "edit") {
        response = await fetch(
          `/api/site-admin/collectives/${encodeURIComponent(collectiveId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: codeValue.trim(),
              name: nameValue.trim(),
              ...(stepCode ? { mfaCode: stepCode } : {}),
            }),
          },
        );
      } else {
        response = await fetch(
          `/api/site-admin/collectives/${encodeURIComponent(collectiveId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              confirm: confirmCode.trim(),
              ...(stepCode ? { mfaCode: stepCode } : {}),
            }),
          },
        );
      }

      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
      };

      if (!response.ok) {
        if (result.code?.startsWith("mfa_step_up_")) {
          setPendingAction(action);
          setMode("stepUp");
          setError(
            mapError(
              result.code,
              result.error ?? t("collectiveActionFailed"),
            ),
          );
          if (result.code !== "mfa_step_up_required") setMfaCode("");
          return;
        }
        if (
          result.code === "collective_update_result_unconfirmed" ||
          result.code === "collective_delete_result_unconfirmed" ||
          result.code === "collective_action_outcome_unconfirmed" ||
          result.code === "collective_action_audit_unavailable"
        ) {
          setResultUnconfirmed(true);
        }
        setError(
          mapError(
            result.code,
            result.error ??
              (action === "edit"
                ? t("collectiveEditFailed")
                : action === "delete"
                  ? t("collectiveDeleteFailed")
                  : archived
                    ? t("collectiveRestoreFailed")
                    : t("collectiveArchiveFailed")),
          ),
        );
        return;
      }

      setMode("idle");
      setPendingAction(null);
      setMfaCode("");
      setConfirmCode("");
      router.refresh();
    } catch {
      setResultUnconfirmed(true);
      setError(t("collectiveActionResultUnconfirmed"));
    } finally {
      setBusy(false);
    }
  }

  const shellClass = stackActions
    ? "flex w-full flex-col items-stretch gap-2"
    : "flex max-w-sm flex-col items-end gap-2";
  const actionRowClass = stackActions
    ? "flex w-full flex-col gap-2"
    : "flex w-full flex-wrap justify-end gap-2";
  const actionBtnClass = stackActions ? "min-h-11 w-full" : "min-h-11";

  return (
    <div className={shellClass}>
      {error ? (
        <Callout tone="danger" role="alert" className="w-full p-2 text-xs">
          {error}
          {resultUnconfirmed ? (
            <div className="mt-2 text-right">
              <Button
                type="button"
                variant="outline"
                className={actionBtnClass}
                onClick={() => window.location.reload()}
              >
                {t("collectiveActionReload")}
              </Button>
            </div>
          ) : null}
        </Callout>
      ) : null}

      {mode === "edit" ? (
        <form
          className="flex w-full flex-col items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run("edit");
          }}
        >
          <Input
            label={t("createCollectiveCode")}
            value={codeValue}
            onChange={(event) => setCodeValue(event.target.value)}
            required
            disabled={busy}
            className="min-h-11 font-mono"
          />
          <Input
            label={t("createCollectiveName")}
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
            required
            disabled={busy}
            className="min-h-11"
          />
          <div className={actionRowClass}>
            <Button
              type="button"
              variant="outline"
              className={actionBtnClass}
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setCodeValue(code);
                setNameValue(name);
                setError(null);
              }}
            >
              {t("collectiveActionCancel")}
            </Button>
            <Button
              type="submit"
              className={actionBtnClass}
              disabled={busy || !codeValue.trim() || !nameValue.trim()}
            >
              {busy ? t("collectiveActionSaving") : t("collectiveEditSave")}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "delete" ? (
        <form
          className="flex w-full flex-col items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run("delete");
          }}
        >
          <p className="text-right text-xs text-opseu-gray-dark">
            {t("collectiveDeleteHelp", { code })}
          </p>
          <Input
            label={t("collectiveDeleteConfirmLabel")}
            value={confirmCode}
            onChange={(event) => setConfirmCode(event.target.value)}
            required
            disabled={busy}
            className="min-h-11 font-mono"
            autoComplete="off"
          />
          <div className={actionRowClass}>
            <Button
              type="button"
              variant="outline"
              className={actionBtnClass}
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setConfirmCode("");
                setError(null);
              }}
            >
              {t("collectiveActionCancel")}
            </Button>
            <Button
              type="submit"
              className={actionBtnClass}
              disabled={
                busy ||
                confirmCode.trim().toLowerCase() !== code.toLowerCase()
              }
            >
              {busy
                ? t("collectiveActionSaving")
                : t("collectiveDeleteConfirm")}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "stepUp" && pendingAction ? (
        <form
          className="flex w-full flex-col items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run(pendingAction, mfaCode);
          }}
        >
          <Input
            label={t("collectiveActionMfaCode")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={32}
            autoFocus
            required
            disabled={busy}
            className="min-h-11"
          />
          <p className="text-right text-xs text-opseu-gray-dark">
            {t("collectiveActionStepUpHelp")}
          </p>
          <div className={actionRowClass}>
            <Button
              type="button"
              variant="outline"
              className={actionBtnClass}
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setPendingAction(null);
                setMfaCode("");
                setError(null);
              }}
            >
              {t("collectiveActionCancel")}
            </Button>
            <Button
              type="submit"
              className={actionBtnClass}
              disabled={busy || !mfaCode.trim()}
            >
              {busy
                ? t("collectiveActionSaving")
                : t("collectiveActionConfirm")}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "idle" ? (
        <div className="flex w-full flex-col items-end gap-2">
          <div className={actionRowClass}>
            <Button
              type="button"
              variant="outline"
              className={actionBtnClass}
              disabled={busy || resultUnconfirmed}
              onClick={() => {
                setCodeValue(code);
                setNameValue(name);
                setMode("edit");
                setError(null);
              }}
            >
              {t("collectiveEdit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={actionBtnClass}
              disabled={busy || resultUnconfirmed}
              onClick={() => void run(archived ? "restore" : "archive")}
            >
              {busy
                ? t("collectiveActionSaving")
                : archived
                  ? t("collectiveRestore")
                  : t("collectiveArchive")}
            </Button>
            {archived && empty ? (
              <Button
                type="button"
                variant="outline"
                className={actionBtnClass}
                disabled={busy || resultUnconfirmed}
                onClick={() => {
                  setConfirmCode("");
                  setMode("delete");
                  setError(null);
                }}
              >
                {t("collectiveDelete")}
              </Button>
            ) : null}
          </div>
          {archived && !empty && deleteBlockedReason ? (
            <p className="max-w-xs text-right text-xs text-opseu-gray-dark">
              {deleteBlockedReason}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
