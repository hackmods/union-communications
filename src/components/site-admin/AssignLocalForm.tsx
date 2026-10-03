"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import {
  UNION_LOCAL_SELECT_OTHER,
  UnionLocalSelect,
  emptyUnionLocalSelectValue,
  type CollectiveOption,
  type LocalOption,
  type SubGroupOption,
  type UnionLocalSelectValue,
  type UnionOption,
} from "@/components/tenant/UnionLocalSelect";

type Props = {
  userId: string;
  initialUnionId?: string | null;
  initialLocalId?: string | null;
  /** When true, assignment writes are blocked (account is archived). */
  archived?: boolean;
  /** When true, assignment writes are blocked (account is locked). */
  locked?: boolean;
};

type OptionsLoadState = "loading" | "ready" | "error";

function selectionComplete(value: UnionLocalSelectValue): boolean {
  if (value.unionId === UNION_LOCAL_SELECT_OTHER) {
    return Boolean(value.newUnionName.trim()) && Boolean(value.localNumber.trim());
  }
  if (!value.unionId) return false;
  return Boolean(value.localId) || Boolean(value.localNumber.trim());
}

/**
 * Site-admin form to restore / assign a user's local membership.
 */
export function AssignLocalForm({
  userId,
  initialUnionId,
  initialLocalId,
  archived = false,
  locked = false,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const accountBlocked = archived || locked;
  const [unions, setUnions] = useState<UnionOption[]>([]);
  const [locals, setLocals] = useState<LocalOption[]>([]);
  const [collectives, setCollectives] = useState<CollectiveOption[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroupOption[]>([]);
  const [optionsLoadState, setOptionsLoadState] =
    useState<OptionsLoadState>("loading");
  const [optionsReloadToken, setOptionsReloadToken] = useState(0);
  const [value, setValue] = useState<UnionLocalSelectValue>(() => ({
    ...emptyUnionLocalSelectValue(),
    unionId: initialUnionId ?? "",
    localId: initialLocalId ?? "",
  }));
  const [replaceActive, setReplaceActive] = useState(false);
  const [needsReplace, setNeedsReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [resultUnconfirmed, setResultUnconfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadOptions = useCallback(async (signal?: { cancelled: boolean }) => {
    setOptionsLoadState("loading");
    try {
      const res = await fetch("/api/site-admin/tenant-options");
      if (!res.ok) {
        if (!signal?.cancelled) setOptionsLoadState("error");
        return;
      }
      const data = (await res.json()) as {
        unions: UnionOption[];
        locals: LocalOption[];
        collectives?: CollectiveOption[];
        subGroups: SubGroupOption[];
      };
      if (signal?.cancelled) return;
      setUnions(data.unions);
      setLocals(data.locals);
      setCollectives(data.collectives ?? []);
      setSubGroups(data.subGroups);
      setOptionsLoadState("ready");
    } catch {
      if (!signal?.cancelled) setOptionsLoadState("error");
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void loadOptions(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [loadOptions, optionsReloadToken]);

  const canEdit =
    !accountBlocked &&
    !busy &&
    !stepUpRequired &&
    !resultUnconfirmed &&
    optionsLoadState === "ready";
  const canSubmit =
    canEdit &&
    selectionComplete(value) &&
    !(stepUpRequired && !mfaCode.trim());

  async function submitAssign(options?: { replace?: boolean }) {
    if (accountBlocked) {
      setError(t("assignLocalAccountBlocked"));
      return;
    }
    if (!selectionComplete(value)) {
      setError(t("assignLocalIncomplete"));
      return;
    }
    const replace = options?.replace ?? replaceActive;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        setPrimary: true,
        replaceActiveMembership: replace,
        ...(mfaCode ? { mfaCode } : {}),
      };
      if (value.unionId === UNION_LOCAL_SELECT_OTHER) {
        body.newUnionName = value.newUnionName.trim();
      } else if (value.unionId) {
        body.unionId = value.unionId;
      }
      if (value.localId) body.localId = value.localId;
      if (value.localNumber.trim()) {
        body.localNumber = value.localNumber.trim();
        body.localSubText = value.localSubText.trim() || undefined;
      }
      if (value.divisionId) body.divisionId = value.divisionId;
      if (value.bargainingUnitId) {
        body.bargainingUnitId = value.bargainingUnitId;
      }

      const res = await fetch(
        `/api/site-admin/users/${encodeURIComponent(userId)}/assign-local`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        ok?: boolean;
        localId?: string;
      };
      if (!res.ok) {
        if (data.code === "mfa_step_up_required") {
          setStepUpRequired(true);
          setError(t("assignLocalStepUpRequired"));
        } else if (data.code === "mfa_step_up_failed") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("assignLocalStepUpFailed"));
        } else if (data.code === "mfa_step_up_limited") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("assignLocalStepUpLimited"));
        } else if (
          data.code === "mfa_step_up_unavailable" ||
          data.code === "audit_unavailable"
        ) {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("assignLocalStepUpUnavailable"));
        } else if (data.code === "assignment_audit_unavailable") {
          setResultUnconfirmed(true);
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("assignLocalAuditUnconfirmed"));
        } else if (data.code === "single_local_conflict") {
          setStepUpRequired(false);
          setMfaCode("");
          setNeedsReplace(true);
          setReplaceActive(true);
          setError(t("assignLocalSingleConflict"));
        } else if (
          data.code === "membership_authority_denied" ||
          data.code === "membership_write_blocked"
        ) {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("assignLocalAuthorityDenied"));
        } else if (data.code === "membership_scope_denied") {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("assignLocalScopeDenied"));
        } else if (data.code === "membership_sync_required") {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("assignLocalSyncRequired"));
        } else if (
          data.code === "postgres_required" ||
          data.error === "Postgres is not configured"
        ) {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("assignLocalPostgresRequired"));
        } else if (
          typeof data.error === "string" &&
          data.error.toLowerCase().includes("user not found or inactive")
        ) {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("assignLocalInactiveAccount"));
        } else {
          setStepUpRequired(false);
          setMfaCode("");
          setError(
            data.code === "assignment_failed"
              ? t("assignLocalFailed")
              : (data.error ?? t("assignLocalFailed")),
          );
        }
        return;
      }
      setMfaCode("");
      setStepUpRequired(false);
      setNeedsReplace(false);
      setSuccess(t("assignLocalSuccess"));
      router.refresh();
    } catch {
      // Network / parse failures must not lock the form as "maybe wrote".
      setStepUpRequired(false);
      setMfaCode("");
      setError(t("assignLocalNetworkFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitAssign();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-6 space-y-4 rounded-md border border-opseu-gray/15 bg-white p-4"
    >
      <h2 className="text-lg font-semibold text-opseu-dark">
        {t("assignLocalTitle")}
      </h2>
      <p className="text-sm text-opseu-gray-dark">{t("assignLocalBody")}</p>

      {accountBlocked ? (
        <Callout tone="warning">
          <p className="font-semibold">{t("assignLocalBlockedTitle")}</p>
          <p className="mt-1">{t("assignLocalAccountBlocked")}</p>
        </Callout>
      ) : null}

      {optionsLoadState === "loading" ? (
        <p className="text-sm text-opseu-gray-dark" aria-live="polite">
          {t("assignLocalOptionsLoading")}
        </p>
      ) : null}

      {optionsLoadState === "error" ? (
        <Callout tone="danger">
          <p className="font-semibold">{t("assignLocalErrorTitle")}</p>
          <p className="mt-1">{t("assignLocalOptionsLoadFailed")}</p>
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOptionsReloadToken((n) => n + 1)}
            >
              {t("assignLocalRetryOptions")}
            </Button>
          </div>
        </Callout>
      ) : null}

      <UnionLocalSelect
        mode="platform"
        unions={unions}
        locals={locals}
        collectives={collectives}
        subGroups={subGroups}
        value={value}
        onChange={(next) => {
          setNeedsReplace(false);
          setSuccess(null);
          setValue(next);
        }}
        disabled={!canEdit}
        allowCreateLocal
      />

      <Checkbox
        checked={replaceActive}
        onChange={(e) => setReplaceActive(e.target.checked)}
        label={t("assignLocalReplace")}
        disabled={!canEdit}
      />

      {stepUpRequired ? (
        <div className="space-y-2">
          <Input
            label={t("assignLocalMfaCode")}
            value={mfaCode}
            onChange={(event) => setMfaCode(event.target.value)}
            autoComplete="one-time-code"
            maxLength={32}
            autoFocus
            required
            disabled={busy || accountBlocked}
          />
          <p className="text-xs text-opseu-gray-dark">
            {t("assignLocalStepUpHelp")}
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setMfaCode("");
              setStepUpRequired(false);
              setError(null);
            }}
          >
            {t("assignLocalCancelStepUp")}
          </Button>
        </div>
      ) : null}

      {error ? (
        <Callout tone="danger">
          <p className="font-semibold">{t("assignLocalErrorTitle")}</p>
          <p className="mt-1">{error}</p>
          {needsReplace ? (
            <div className="mt-3">
              <Button
                type="button"
                disabled={!canSubmit}
                onClick={() => void submitAssign({ replace: true })}
              >
                {busy ? t("assignLocalSaving") : t("assignLocalReplaceSubmit")}
              </Button>
            </div>
          ) : null}
        </Callout>
      ) : null}
      {success ? (
        <Callout tone="success">
          <p className="font-semibold">{t("assignLocalSuccessTitle")}</p>
          <p className="mt-1">{success}</p>
        </Callout>
      ) : null}

      <Button type="submit" disabled={!canSubmit}>
        {busy ? t("assignLocalSaving") : t("assignLocalSubmit")}
      </Button>
    </form>
  );
}
