"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  UNION_LOCAL_SELECT_OTHER,
  UnionLocalSelect,
  emptyUnionLocalSelectValue,
  type LocalOption,
  type SubGroupOption,
  type UnionLocalSelectValue,
  type UnionOption,
} from "@/components/tenant/UnionLocalSelect";

type Props = {
  userId: string;
  initialUnionId?: string | null;
  initialLocalId?: string | null;
};

/**
 * Site-admin form to restore / assign a user's local membership.
 */
export function AssignLocalForm({
  userId,
  initialUnionId,
  initialLocalId,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [unions, setUnions] = useState<UnionOption[]>([]);
  const [locals, setLocals] = useState<LocalOption[]>([]);
  const [subGroups, setSubGroups] = useState<SubGroupOption[]>([]);
  const [value, setValue] = useState<UnionLocalSelectValue>(() => ({
    ...emptyUnionLocalSelectValue(),
    unionId: initialUnionId ?? "",
    localId: initialLocalId ?? "",
  }));
  const [replaceActive, setReplaceActive] = useState(false);
  const [needsReplace, setNeedsReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/site-admin/tenant-options");
        if (!res.ok) return;
        const data = (await res.json()) as {
          unions: UnionOption[];
          locals: LocalOption[];
          subGroups: SubGroupOption[];
        };
        if (cancelled) return;
        setUnions(data.unions);
        setLocals(data.locals);
        setSubGroups(data.subGroups);
      } catch {
        // leave empty — form still allows typed local number after union pick
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submitAssign(options?: { replace?: boolean }) {
    const replace = options?.replace ?? replaceActive;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const body: Record<string, unknown> = {
        setPrimary: true,
        replaceActiveMembership: replace,
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
        if (data.code === "single_local_conflict") {
          setNeedsReplace(true);
          setReplaceActive(true);
          setError(t("assignLocalSingleConflict"));
        } else {
          setError(data.error ?? t("assignLocalFailed"));
        }
        return;
      }
      setNeedsReplace(false);
      setSuccess(t("assignLocalSuccess"));
      router.refresh();
    } catch {
      setError(t("assignLocalFailed"));
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

      <UnionLocalSelect
        mode="platform"
        unions={unions}
        locals={locals}
        subGroups={subGroups}
        value={value}
        onChange={(next) => {
          setNeedsReplace(false);
          setValue(next);
        }}
        disabled={busy}
        allowCreateLocal
      />

      <Checkbox
        checked={replaceActive}
        onChange={(e) => setReplaceActive(e.target.checked)}
        label={t("assignLocalReplace")}
        disabled={busy}
      />

      {error ? (
        <Callout tone="danger">
          <p className="font-semibold">{t("assignLocalErrorTitle")}</p>
          <p className="mt-1">{error}</p>
          {needsReplace ? (
            <div className="mt-3">
              <Button
                type="button"
                disabled={busy}
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

      <Button type="submit" disabled={busy}>
        {busy ? t("assignLocalSaving") : t("assignLocalSubmit")}
      </Button>
    </form>
  );
}
