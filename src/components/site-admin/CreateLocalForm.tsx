"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Callout } from "@/components/ui/Callout";
import type { MembershipPolicy } from "@/lib/db/schema/tenant";

type Props = {
  unionId: string;
  membershipPolicy: MembershipPolicy;
  collectives: Array<{ id: string; name: string }>;
};

export function CreateLocalForm({ unionId, membershipPolicy, collectives }: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [localNumber, setLocalNumber] = useState("");
  const [subText, setSubText] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [collectiveCode, setCollectiveCode] = useState("");
  const [collectiveName, setCollectiveName] = useState("");
  const [collectionCode, setCollectionCode] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [policy, setPolicy] = useState<MembershipPolicy>(membershipPolicy);
  const [busy, setBusy] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [stepUpRequired, setStepUpRequired] = useState(false);
  const [policyResultUnconfirmed, setPolicyResultUnconfirmed] = useState(false);
  const [localStepUpRequired, setLocalStepUpRequired] = useState(false);
  const [localMfaCode, setLocalMfaCode] = useState("");
  const [localResultUnconfirmed, setLocalResultUnconfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function savePolicy(code?: string) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/site-admin/unions/${encodeURIComponent(unionId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            membershipPolicy: policy,
            ...(code ? { mfaCode: code } : {}),
          }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        multiLocalMemberCount?: number;
      };
      if (!res.ok) {
        if (data.code === "mfa_step_up_required") {
          setStepUpRequired(true);
          setError(t("membershipPolicyStepUpRequired"));
        } else if (data.code === "mfa_step_up_failed") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("membershipPolicyStepUpFailed"));
        } else if (data.code === "mfa_step_up_limited") {
          setStepUpRequired(true);
          setMfaCode("");
          setError(t("membershipPolicyStepUpLimited"));
        } else if (
          data.code === "mfa_step_up_unavailable" ||
          data.code === "audit_unavailable"
        ) {
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("membershipPolicyStepUpUnavailable"));
        } else if (data.code === "membership_policy_result_unconfirmed") {
          setPolicyResultUnconfirmed(true);
          setStepUpRequired(false);
          setMfaCode("");
          setError(t("membershipPolicyResultUnconfirmed"));
        } else {
          setStepUpRequired(false);
          setMfaCode("");
          setError(data.error ?? t("createLocalFailed"));
        }
        return;
      }
      setMfaCode("");
      setStepUpRequired(false);
      if (
        policy === "single_local" &&
        (data.multiLocalMemberCount ?? 0) > 0
      ) {
        setMessage(
          t("membershipPolicySavedWithWarning", {
            count: data.multiLocalMemberCount ?? 0,
          }),
        );
      } else {
        setMessage(t("membershipPolicySaved"));
      }
      router.refresh();
    } catch {
      setPolicyResultUnconfirmed(true);
      setStepUpRequired(false);
      setMfaCode("");
      setError(t("membershipPolicyResultUnconfirmed"));
    } finally {
      setBusy(false);
    }
  }

  async function createLocal(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/site-admin/locals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unionId,
          localNumber: localNumber.trim(),
          localSubText: subText.trim() || undefined,
          ...(divisionId ? { divisionId } : {}),
          ...(collectionCode.trim() && collectionName.trim()
            ? {
                collectionCode: collectionCode.trim(),
                collectionName: collectionName.trim(),
              }
            : {}),
          ...(localStepUpRequired ? { mfaCode: localMfaCode } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        created?: boolean;
      };
      if (!res.ok) {
        if (data.code === "mfa_step_up_required") {
          setLocalStepUpRequired(true);
          setError(t("createLocalMfaRequired"));
        } else if (data.code === "mfa_step_up_failed") {
          setLocalStepUpRequired(true);
          setLocalMfaCode("");
          setError(t("createLocalMfaFailed"));
        } else if (data.code === "mfa_step_up_limited") {
          setLocalStepUpRequired(true);
          setLocalMfaCode("");
          setError(t("createLocalMfaLimited"));
        } else if (data.code === "mfa_step_up_unavailable" || data.code === "audit_unavailable" || data.code === "durable_storage_required") {
          setLocalStepUpRequired(false);
          setLocalMfaCode("");
          setError(t("createLocalMfaUnavailable"));
        } else if (data.code === "local_result_unconfirmed") {
          setLocalResultUnconfirmed(true);
          setLocalStepUpRequired(false);
          setLocalMfaCode("");
          setError(t("createLocalResultUnconfirmed"));
        } else {
          setLocalStepUpRequired(false);
          setLocalMfaCode("");
          setError(data.error ?? t("createLocalFailed"));
        }
        return;
      }
      setLocalMfaCode("");
      setLocalStepUpRequired(false);
      setLocalResultUnconfirmed(false);
      setMessage(
        data.created ? t("createLocalCreated") : t("createLocalExisting"),
      );
      setLocalNumber("");
      setSubText("");
      setCollectionCode("");
      setCollectionName("");
      router.refresh();
    } catch {
      setError(t("createLocalFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function createCollective(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_collective", unionId, code: collectiveCode.trim(), name: collectiveName.trim() }),
      });
      const data = await res.json() as { error?: string; collective?: { id: string } };
      if (!res.ok || !data.collective) {
        setError(data.error ?? t("createCollectiveFailed"));
        return;
      }
      setDivisionId(data.collective.id);
      setCollectiveCode("");
      setCollectiveName("");
      setMessage(t("createCollectiveSaved"));
      router.refresh();
    } catch {
      setError(t("createCollectiveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-md border border-opseu-gray/15 bg-white p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("membershipPolicyTitle")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {t("membershipPolicyBody")}
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Select
            label={t("membershipPolicyLabel")}
            value={policy}
            disabled={busy || stepUpRequired || policyResultUnconfirmed}
            onChange={(e) =>
              setPolicy(e.target.value as MembershipPolicy)
            }
          >
            <option value="multi_local">{t("membershipPolicyMulti")}</option>
            <option value="single_local">{t("membershipPolicySingle")}</option>
          </Select>
          <Button
            type="button"
            disabled={
              busy ||
              policyResultUnconfirmed ||
              (stepUpRequired && !mfaCode.trim())
            }
            onClick={() =>
              void savePolicy(stepUpRequired ? mfaCode : undefined)
            }
          >
            {t("membershipPolicySave")}
          </Button>
        </div>
        {stepUpRequired ? (
          <div className="mt-3 space-y-2">
            <Input
              label={t("membershipPolicyMfaCode")}
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value)}
              autoComplete="one-time-code"
              maxLength={32}
              autoFocus
              disabled={busy}
            />
            <p className="text-xs text-opseu-gray-dark">
              {t("membershipPolicyStepUpHelp")}
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
              {t("membershipPolicyCancelStepUp")}
            </Button>
          </div>
        ) : null}
      </section>

      <form onSubmit={createCollective} className="space-y-3 rounded-md border border-opseu-gray/15 bg-white p-4">
        <h2 className="text-lg font-semibold text-opseu-dark">{t("createCollectiveTitle")}</h2>
        <p className="text-sm text-opseu-gray-dark">{t("createCollectiveBody")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t("createCollectiveCode")} value={collectiveCode} required disabled={busy} maxLength={32} onChange={(event) => setCollectiveCode(event.target.value)} />
          <Input label={t("createCollectiveName")} value={collectiveName} required disabled={busy} maxLength={200} onChange={(event) => setCollectiveName(event.target.value)} />
        </div>
        <Button type="submit" disabled={busy || !collectiveCode.trim() || !collectiveName.trim()}>{t("createCollectiveSubmit")}</Button>
      </form>

      <form
        onSubmit={createLocal}
        className="space-y-3 rounded-md border border-opseu-gray/15 bg-white p-4"
      >
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("createLocalTitle")}
        </h2>
        <p className="text-sm text-opseu-gray-dark">{t("createLocalBody")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select label={t("createLocalCollective")} value={divisionId} disabled={busy} onChange={(event) => setDivisionId(event.target.value)}>
              <option value="">{t("createLocalCollectiveOther")}</option>
              {collectives.map((collective) => <option key={collective.id} value={collective.id}>{collective.name}</option>)}
              {divisionId && !collectives.some((collective) => collective.id === divisionId) ? <option value={divisionId}>{t("createCollectiveSaved")}</option> : null}
            </Select>
          </div>
          <Input
            label={t("createLocalNumber")}
            value={localNumber}
            required
            disabled={busy}
            onChange={(e) => setLocalNumber(e.target.value)}
          />
          <Input
            label={t("createLocalSubText")}
            value={subText}
            disabled={busy}
            onChange={(e) => setSubText(e.target.value)}
          />
          <Input
            label={t("createLocalCollectionCode")}
            value={collectionCode}
            disabled={busy}
            onChange={(e) => setCollectionCode(e.target.value)}
          />
          <Input
            label={t("createLocalCollectionName")}
            value={collectionName}
            disabled={busy}
            onChange={(e) => setCollectionName(e.target.value)}
          />
        </div>
        {localStepUpRequired ? (
          <div className="space-y-2">
            <Input
              label={t("createLocalMfaCode")}
              value={localMfaCode}
              onChange={(event) => setLocalMfaCode(event.target.value)}
              autoComplete="one-time-code"
              maxLength={32}
              autoFocus
              disabled={busy || localResultUnconfirmed}
            />
            <p className="text-xs text-opseu-gray-dark">{t("createLocalMfaHelp")}</p>
          </div>
        ) : null}
        <Button type="submit" disabled={busy || !localNumber.trim() || localResultUnconfirmed || (localStepUpRequired && !localMfaCode.trim())}>
          {busy ? t("createLocalSaving") : t("createLocalSubmit")}
        </Button>
      </form>

      {error ? (
        <Callout tone="danger">
          <p className="font-semibold">{t("createLocalErrorTitle")}</p>
          <p className="mt-1">{error}</p>
          {policyResultUnconfirmed ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              {t("membershipPolicyReload")}
            </Button>
          ) : null}
          {localResultUnconfirmed ? (
            <Button type="button" variant="outline" className="mt-3" onClick={() => window.location.reload()}>
              {t("createLocalReload")}
            </Button>
          ) : null}
        </Callout>
      ) : null}
      {message ? (
        <Callout tone="success">
          <p className="font-semibold">{t("createLocalSuccessTitle")}</p>
          <p className="mt-1">{message}</p>
        </Callout>
      ) : null}
    </div>
  );
}
