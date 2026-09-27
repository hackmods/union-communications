"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";

type Props = {
  unionId: string;
  slug: string;
  name: string;
  archived: boolean;
  empty: boolean;
};

type Mode = "idle" | "rename" | "delete" | "stepUp";

/**
 * Rename / archive / restore / empty-delete for a Site Admin unions row.
 */
export function UnionLifecycleActions({
  unionId,
  slug,
  name,
  archived,
  empty,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>("idle");
  const [pendingAction, setPendingAction] = useState<
    "archive" | "restore" | "rename" | "delete" | null
  >(null);
  const [mfaCode, setMfaCode] = useState("");
  const [renameValue, setRenameValue] = useState(name);
  const [confirmSlug, setConfirmSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultUnconfirmed, setResultUnconfirmed] = useState(false);

  function mapError(code: string | undefined, fallback: string): string {
    if (code === "mfa_step_up_required") return t("unionActionStepUpRequired");
    if (code === "mfa_step_up_failed") return t("unionActionStepUpFailed");
    if (code === "mfa_step_up_limited") return t("unionActionStepUpLimited");
    if (
      code === "mfa_step_up_unavailable" ||
      code === "audit_unavailable" ||
      code === "union_action_audit_unavailable"
    ) {
      return t("unionActionStepUpUnavailable");
    }
    if (
      code === "union_update_result_unconfirmed" ||
      code === "union_delete_result_unconfirmed" ||
      code === "union_action_outcome_unconfirmed"
    ) {
      return t("unionActionResultUnconfirmed");
    }
    if (code === "name_taken") return t("unionRenameNameTaken");
    if (code === "not_empty") return t("unionDeleteNotEmpty");
    if (code === "archive_required") return t("unionDeleteArchiveRequired");
    if (code === "confirm_mismatch") return t("unionDeleteConfirmMismatch");
    return fallback;
  }

  async function run(
    action: "archive" | "restore" | "rename" | "delete",
    code?: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      let response: Response;
      if (action === "archive" || action === "restore") {
        response = await fetch(
          `/api/site-admin/unions/${encodeURIComponent(unionId)}/${action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(code ? { mfaCode: code } : {}),
          },
        );
      } else if (action === "rename") {
        response = await fetch(
          `/api/site-admin/unions/${encodeURIComponent(unionId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: renameValue.trim(),
              ...(code ? { mfaCode: code } : {}),
            }),
          },
        );
      } else {
        response = await fetch(
          `/api/site-admin/unions/${encodeURIComponent(unionId)}`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              confirm: confirmSlug.trim(),
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
          setError(mapError(result.code, result.error ?? t("unionActionFailed")));
          if (result.code !== "mfa_step_up_required") setMfaCode("");
          return;
        }
        if (
          result.code === "union_update_result_unconfirmed" ||
          result.code === "union_delete_result_unconfirmed" ||
          result.code === "union_action_audit_unavailable"
        ) {
          setResultUnconfirmed(true);
        }
        setError(
          mapError(
            result.code,
            result.error ??
              (action === "rename"
                ? t("unionRenameFailed")
                : action === "delete"
                  ? t("unionDeleteFailed")
                  : archived
                    ? t("unionRestoreFailed")
                    : t("unionArchiveFailed")),
          ),
        );
        return;
      }

      setMode("idle");
      setPendingAction(null);
      setMfaCode("");
      setConfirmSlug("");
      router.refresh();
    } catch {
      setResultUnconfirmed(true);
      setError(t("unionActionResultUnconfirmed"));
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
                {t("unionActionReload")}
              </Button>
            </div>
          ) : null}
        </Callout>
      ) : null}

      {mode === "rename" ? (
        <form
          className="flex w-full flex-col items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void run("rename");
          }}
        >
          <Input
            label={t("unionRenameLabel")}
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            required
            disabled={busy}
            className="min-h-9 px-2 py-1 text-sm"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setMode("idle");
                setRenameValue(name);
                setError(null);
              }}
            >
              {t("unionActionCancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || !renameValue.trim()}
            >
              {busy ? t("unionActionSaving") : t("unionRenameSave")}
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
            {t("unionDeleteHelp", { slug })}
          </p>
          <Input
            label={t("unionDeleteConfirmLabel")}
            value={confirmSlug}
            onChange={(event) => setConfirmSlug(event.target.value)}
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
                setConfirmSlug("");
                setError(null);
              }}
            >
              {t("unionActionCancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || confirmSlug.trim() !== slug}
            >
              {busy ? t("unionActionSaving") : t("unionDeleteConfirm")}
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
            label={t("unionActionMfaCode")}
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
            {t("unionActionStepUpHelp")}
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
              {t("unionActionCancel")}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || !mfaCode.trim()}
            >
              {busy ? t("unionActionSaving") : t("unionActionConfirm")}
            </Button>
          </div>
        </form>
      ) : null}

      {mode === "idle" ? (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || resultUnconfirmed}
            onClick={() => {
              setRenameValue(name);
              setMode("rename");
              setError(null);
            }}
          >
            {t("unionRename")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || resultUnconfirmed}
            onClick={() => void run(archived ? "restore" : "archive")}
          >
            {busy
              ? t("unionActionSaving")
              : archived
                ? t("unionRestore")
                : t("unionArchive")}
          </Button>
          {archived && empty ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || resultUnconfirmed}
              onClick={() => {
                setConfirmSlug("");
                setMode("delete");
                setError(null);
              }}
            >
              {t("unionDelete")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
