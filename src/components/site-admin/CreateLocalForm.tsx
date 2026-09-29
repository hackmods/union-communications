"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Callout } from "@/components/ui/Callout";
import type { MembershipPolicy } from "@/lib/db/schema/tenant";
import type { BrandStructureOption } from "@/lib/site-admin/brand-structure-options";

type Props = {
  unionId: string;
  membershipPolicy: MembershipPolicy;
  collectives: Array<{ id: string; name: string }>;
  collectionCatalog: BrandStructureOption[];
};

/**
 * Membership policy + create local (collective create lives on CollectivesAdminPanel).
 */
export function CreateLocalForm({
  unionId,
  membershipPolicy,
  collectives,
  collectionCatalog,
}: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [localNumber, setLocalNumber] = useState("");
  const [subText, setSubText] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [collectionCatalogKey, setCollectionCatalogKey] = useState("");
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

  function applyCollectionCatalog(key: string) {
    setCollectionCatalogKey(key);
    if (!key) return;
    const option = collectionCatalog.find((row) => row.code === key);
    if (option) {
      setCollectionCode(option.code);
      setCollectionName(option.name);
    }
  }

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
      setPolicyResultUnconfirmed(false);
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
        } else if (
          data.code === "mfa_step_up_unavailable" ||
          data.code === "audit_unavailable"
        ) {
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
      setCollectionCatalogKey("");
      setCollectionCode("");
      setCollectionName("");
      router.refresh();
    } catch {
      setError(t("createLocalFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section
        id="organization-policy"
        className="scroll-mt-28 rounded-md border border-opseu-gray/15 bg-white p-4"
      >
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
            className="min-h-11"
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
              className="min-h-11"
            />
            <p className="text-xs text-opseu-gray-dark">
              {t("membershipPolicyStepUpHelp")}
            </p>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
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

      <form
        id="organization-create-local"
        onSubmit={createLocal}
        className="scroll-mt-28 space-y-3 rounded-md border border-opseu-gray/15 bg-white p-4"
      >
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("createLocalTitle")}
        </h2>
        <p className="text-sm text-opseu-gray-dark">{t("createLocalBody")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select
              label={t("createLocalCollective")}
              value={divisionId}
              disabled={busy}
              onChange={(event) => setDivisionId(event.target.value)}
            >
              <option value="">{t("createLocalCollectiveOther")}</option>
              {collectives.map((collective) => (
                <option key={collective.id} value={collective.id}>
                  {collective.name}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label={t("createLocalNumber")}
            value={localNumber}
            required
            disabled={busy}
            className="min-h-11"
            onChange={(e) => setLocalNumber(e.target.value)}
          />
          <Input
            label={t("createLocalSubText")}
            value={subText}
            disabled={busy}
            className="min-h-11"
            onChange={(e) => setSubText(e.target.value)}
          />
          {collectionCatalog.length > 0 ? (
            <div className="sm:col-span-2">
              <Select
                label={t("createLocalCollectionFromBrand")}
                value={collectionCatalogKey}
                disabled={busy}
                onChange={(event) =>
                  applyCollectionCatalog(event.target.value)
                }
              >
                <option value="">
                  {t("createLocalCollectionFromBrandPlaceholder")}
                </option>
                {collectionCatalog.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name} ({option.code})
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <Input
            label={t("createLocalCollectionCode")}
            value={collectionCode}
            disabled={busy}
            className="min-h-11"
            onChange={(e) => {
              setCollectionCatalogKey("");
              setCollectionCode(e.target.value);
            }}
          />
          <Input
            label={t("createLocalCollectionName")}
            value={collectionName}
            disabled={busy}
            className="min-h-11"
            onChange={(e) => {
              setCollectionCatalogKey("");
              setCollectionName(e.target.value);
            }}
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
              className="min-h-11"
            />
            <p className="text-xs text-opseu-gray-dark">
              {t("createLocalMfaHelp")}
            </p>
          </div>
        ) : null}
        <Button
          type="submit"
          className="min-h-11"
          disabled={
            busy ||
            !localNumber.trim() ||
            localResultUnconfirmed ||
            (localStepUpRequired && !localMfaCode.trim())
          }
        >
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
              className="mt-3 min-h-11"
              onClick={() => window.location.reload()}
            >
              {t("membershipPolicyReload")}
            </Button>
          ) : null}
          {localResultUnconfirmed ? (
            <Button
              type="button"
              variant="outline"
              className="mt-3 min-h-11"
              onClick={() => window.location.reload()}
            >
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
