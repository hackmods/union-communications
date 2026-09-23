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
};

export function CreateLocalForm({ unionId, membershipPolicy }: Props) {
  const t = useTranslations("hub.platformOperator");
  const router = useRouter();
  const [localNumber, setLocalNumber] = useState("");
  const [subText, setSubText] = useState("");
  const [collectionCode, setCollectionCode] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [policy, setPolicy] = useState<MembershipPolicy>(membershipPolicy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function savePolicy() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/site-admin/unions/${encodeURIComponent(unionId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ membershipPolicy: policy }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? t("createLocalFailed"));
        return;
      }
      setMessage(t("membershipPolicySaved"));
      router.refresh();
    } catch {
      setError(t("createLocalFailed"));
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
          ...(collectionCode.trim() && collectionName.trim()
            ? {
                collectionCode: collectionCode.trim(),
                collectionName: collectionName.trim(),
              }
            : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        created?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? t("createLocalFailed"));
        return;
      }
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
            disabled={busy}
            onChange={(e) =>
              setPolicy(e.target.value as MembershipPolicy)
            }
          >
            <option value="multi_local">{t("membershipPolicyMulti")}</option>
            <option value="single_local">{t("membershipPolicySingle")}</option>
          </Select>
          <Button type="button" disabled={busy} onClick={() => void savePolicy()}>
            {t("membershipPolicySave")}
          </Button>
        </div>
      </section>

      <form
        onSubmit={createLocal}
        className="space-y-3 rounded-md border border-opseu-gray/15 bg-white p-4"
      >
        <h2 className="text-lg font-semibold text-opseu-dark">
          {t("createLocalTitle")}
        </h2>
        <p className="text-sm text-opseu-gray-dark">{t("createLocalBody")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
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
        <Button type="submit" disabled={busy || !localNumber.trim()}>
          {busy ? t("createLocalSaving") : t("createLocalSubmit")}
        </Button>
      </form>

      {error ? (
        <Callout tone="danger">
          <p className="font-semibold">{t("createLocalErrorTitle")}</p>
          <p className="mt-1">{error}</p>
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
