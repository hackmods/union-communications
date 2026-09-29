"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type CollectiveOption = { id: string; name: string };

type Props = {
  localId: string;
  localNumber: string;
  subText: string;
  divisionId: string | null;
  archived: boolean;
  empty: boolean;
  collectives: CollectiveOption[];
  deleteBlockedReason?: string | null;
};

type Mode = "idle" | "edit" | "delete" | "stepUp";

/**
 * Edit / archive / restore / empty-delete for a Site Admin local row.
 */
export function LocalLifecycleActions({
  localId,
  localNumber,
  subText,
  divisionId,
  archived,
  empty,
  collectives,
  deleteBlockedReason = null,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [pendingAction, setPendingAction] = useState<
    "archive" | "restore" | "edit" | "delete" | null
  >(null);
  const [mfaCode, setMfaCode] = useState("");
  const [numberValue, setNumberValue] = useState(localNumber);
  const [subTextValue, setSubTextValue] = useState(subText);
  const [divisionValue, setDivisionValue] = useState(divisionId ?? "");
  const [confirmNumber, setConfirmNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultUnconfirmed, setResultUnconfirmed] = useState(false);

  function mapError(code: string | undefined, fallback: string): string {
    if (code === "mfa_step_up_required") return t("localActionStepUpRequired");
    if (code === "mfa_step_up_failed") return t("localActionStepUpFailed");
    if (code === "mfa_step_up_limited") return t("localActionStepUpLimited");
    if (
      code === "mfa_step_up_unavailable" ||
      code === "audit_unavailable" ||
      code === "local_action_audit_unavailable"
    ) {
      return t("localActionStepUpUnavailable");
    }
    if (
      code === "local_update_result_unconfirmed" ||
      code === "local_delete_result_unconfirmed" ||
      code === "local_action_outcome_unconfirmed"
    ) {
      return t("localActionResultUnconfirmed");
    }
    if (code === "number_taken") return t("localEditNumberTaken");
    if (code === "not_empty") return t("localDeleteNotEmpty");
    if (code === "archive_required") return t("localDeleteArchiveRequired");
    if (code === "confirm_mismatch") return t("localDeleteConfirmMismatch");
    return fallback;
  }

  async function run(
    action: "archive" | "restore" | "edit" | "delete",
    code?: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      let response: Response;
      if (action === "archive" || action === "restore") {
        response = await fetch(
          `/api/site-admin/locals/${encodeURIComponent(localId)}/${action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(code ? { mfaCode: code } : {}),
          },
        );
      } else if (action === "edit") {
        response = await fetch(
          `/api/site-admin/locals/${encodeURIComponent(localId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              localNumber: numberValue.trim(),
              subText: subTextValue.trim(),
              divisionId: divisionValue.trim() || null,
              ...(code ? { mfaCode: code } : {}),
            }),
          },
        );
      } else {
        response = await fetch(
          `/api/site-admin/locals/${encodeURIComponent(localId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              confirm: confirmNumber.trim(),
              ...(code ? { mfaCode: code } : {}),
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
          setError(mapError(result.code, result.error ?? t("localActionFailed")));
          if (result.code !== "mfa_step_up_required") setMfaCode("");
          return;
        }
        if (
          result.code === "local_update_result_unconfirmed" ||
          result.code === "local_delete_result_unconfirmed" ||
          result.code === "local_action_outcome_unconfirmed" ||
          result.code === "local_action_audit_unavailable"
        ) {
          setResultUnconfirmed(true);
        }
        setError(
          mapError(
            result.code,
            result.error ??
              (action === "edit"
                ? t("localEditFailed")
                : action === "delete"
                  ? t("localDeleteFailed")
                  : archived
                    ? t("localRestoreFailed")
                    : t("localArchiveFailed")),
          ),
        );
        return;
      }

      setMode("idle");
      setPendingAction(null);
      setMfaCode("");
      setConfirmNumber("");
      router.refresh();
    } catch {
      setResultUnconfirmed(true);
      setError(t("localActionResultUnconfirmed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex max-w-sm flex-col items-end gap-2">
      {error ? (
        <Callout tone="danger" role="alert" className="w-full p-2 text-xs">
          {error}
          {resultUnconfirmed ? (
            <div className="mt-2 text-right">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.location.reload()}
              >
                {t("localActionReload")}
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
            label={t("createLocalNumber")}
            value={numberValue}
            onChange={(event) => setNumberValue(event.target.value)}
            required
            disabled={busy}
            className="min-h-9 px-2 py-1 text-sm font-mono"
          />
          <Input
            label={t("createLocalSubText")}
            value={subTextValue}
            onChange={(event) => setSubTextValue(event.target.value)}
            disabled={busy}
            className="min-h-9 px-2 py-1 text-sm"
          />
          <Select
            label={t("createLocalCollective")}
            value={divisionValue}
            disabled={busy}
            onChange={(event) => setDivisionValue(event.target.value)}
          >
            <option value="">{t("createLocalCollectiveOther")}</option>
            {collectives.map((collective) => (
              <option key={collective.id} value={collective.id}>
                {collective.name}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setNumberValue(localNumber);
                setSubTextValue(subText);
                setDivisionValue(divisionId ?? "");
                setError(null);
              }}
            >
              {t("localActionCancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || !numberValue.trim()}
            >
              {busy ? t("localArchiveSaving") : t("localEditSave")}
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
            {t("localDeleteHelp", { number: localNumber })}
          </p>
          <Input
            label={t("localDeleteConfirmLabel")}
            value={confirmNumber}
            onChange={(event) => setConfirmNumber(event.target.value)}
            required
            disabled={busy}
            className="min-h-9 px-2 py-1 text-sm font-mono"
            autoComplete="off"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setConfirmNumber("");
                setError(null);
              }}
            >
              {t("localActionCancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || confirmNumber.trim() !== localNumber}
            >
              {busy ? t("localArchiveSaving") : t("localDeleteConfirm")}
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
            label={t("localActionMfaCode")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={32}
            autoFocus
            required
            disabled={busy}
            className="min-h-9 px-2 py-1 text-sm"
          />
          <p className="text-right text-xs text-opseu-gray-dark">
            {t("localActionStepUpHelp")}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setPendingAction(null);
                setMfaCode("");
                setError(null);
              }}
            >
              {t("localActionCancelStepUp")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || !mfaCode.trim()}
            >
              {busy ? t("localArchiveSaving") : t("localActionConfirm")}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "idle" ? (
        <div className="flex w-full flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || resultUnconfirmed}
              onClick={() => {
                setNumberValue(localNumber);
                setSubTextValue(subText);
                setDivisionValue(divisionId ?? "");
                setMode("edit");
                setError(null);
              }}
            >
              {t("localEdit")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || resultUnconfirmed}
              onClick={() => void run(archived ? "restore" : "archive")}
            >
              {busy
                ? t("localArchiveSaving")
                : archived
                  ? t("localRestore")
                  : t("localArchive")}
            </Button>
            {archived && empty ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy || resultUnconfirmed}
                onClick={() => {
                  setConfirmNumber("");
                  setMode("delete");
                  setError(null);
                }}
              >
                {t("localDelete")}
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
