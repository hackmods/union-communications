"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";
import { CapRoverConfigCopyButton } from "@/components/site-admin/CapRoverConfigCopyButton";
import {
  HOSTED_SEAT_SKU_CAPS,
  UNSET_HOSTED_PLAN,
  resolveInheritedPlan,
  type HostedPlanRecord,
} from "@/lib/tenant/hosted-plans";

type UnionRow = {
  id: string;
  name: string;
  slug: string;
  plan: HostedPlanRecord;
};

type LocalRow = {
  id: string;
  unionId: string;
  localNumber: string;
  plan: HostedPlanRecord;
};

type Snapshot = {
  durable: boolean;
  enforcementEnabled: boolean;
  envKey: string;
  seatSkuCents: { solo: number; exec_under_50: number };
  unions: UnionRow[];
  locals: LocalRow[];
};

type FormState = {
  accessClass: string;
  commercialClass: string;
  seatSku: string;
  donationAcknowledged: boolean;
  notes: string;
};

function formFromPlan(plan: HostedPlanRecord): FormState {
  return {
    accessClass: plan.accessClass,
    commercialClass: plan.commercialClass,
    seatSku: plan.seatSku ?? "",
    donationAcknowledged: plan.donationAcknowledged,
    notes: plan.notes,
  };
}

const EMPTY_FORM: FormState = {
  accessClass: "unset",
  commercialClass: "unset",
  seatSku: "",
  donationAcknowledged: false,
  notes: "",
};

export function HostedPlansAdminPanel() {
  const t = useTranslations("hostedPlansAdmin");
  const [data, setData] = useState<Snapshot | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [unionId, setUnionId] = useState("");
  const [localId, setLocalId] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [feedback, setFeedback] = useState<"saved" | "error" | null>(null);
  const [busy, setBusy] = useState(false);

  const applySelection = useCallback(
    (snapshot: Snapshot, nextUnionId: string, nextLocalId: string) => {
      if (nextLocalId) {
        const local = snapshot.locals.find((row) => row.id === nextLocalId);
        setForm(local ? formFromPlan(local.plan) : EMPTY_FORM);
        return;
      }
      const union = snapshot.unions.find((row) => row.id === nextUnionId);
      setForm(union ? formFromPlan(union.plan) : EMPTY_FORM);
    },
    [],
  );

  const load = useCallback(async () => {
    setLoadFailed(false);
    const res = await fetch("/api/site-admin/hosted-plans", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("load");
    const json = (await res.json()) as Snapshot;
    setData(json);
    const nextUnionId = unionId || json.unions[0]?.id || "";
    const nextLocalId = localId;
    if (!unionId && nextUnionId) setUnionId(nextUnionId);
    applySelection(json, nextUnionId, nextLocalId);
  }, [applySelection, localId, unionId]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load snapshot on mount
    void load().catch(() => {
      if (!cancelled) {
        setLoadFailed(true);
        setFeedback("error");
      }
    });
    return () => {
      cancelled = true;
    };
    // Mount-only bootstrap; subsequent loads go through save() / retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localsForUnion = useMemo(
    () => (data?.locals ?? []).filter((row) => row.unionId === unionId),
    [data, unionId],
  );

  const selectedUnionPlan = useMemo(() => {
    return data?.unions.find((row) => row.id === unionId)?.plan ?? UNSET_HOSTED_PLAN;
  }, [data, unionId]);

  const selectedLocalPlan = useMemo(() => {
    if (!localId) return UNSET_HOSTED_PLAN;
    return (
      data?.locals.find((row) => row.id === localId)?.plan ?? UNSET_HOSTED_PLAN
    );
  }, [data, localId]);

  const effectivePlan = useMemo(
    () => resolveInheritedPlan(selectedUnionPlan, selectedLocalPlan),
    [selectedLocalPlan, selectedUnionPlan],
  );

  const caproverBlock = data
    ? `# Hosted Free/Full caps — leave false until Site Admin assigns plans\n${data.envKey}=false\n# ${data.envKey}=true`
    : "";

  async function save(scope: "union" | "local") {
    setBusy(true);
    setFeedback(null);
    try {
      const id = scope === "union" ? unionId : localId;
      if (!id) throw new Error("missing");
      const res = await fetch("/api/site-admin/hosted-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          id,
          accessClass: form.accessClass,
          commercialClass: form.commercialClass,
          seatSku: form.seatSku || null,
          donationAcknowledged: form.donationAcknowledged,
          notes: form.notes,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "save");
      }
      setFeedback("saved");
      await load();
    } catch {
      setFeedback("error");
    } finally {
      setBusy(false);
    }
  }

  if (!data && loadFailed) {
    return (
      <div className="mt-6 space-y-3">
        <Callout tone="danger" role="alert">
          <p>{t("error")}</p>
          <p className="mt-1">{t("errorNext")}</p>
        </Callout>
        <Button
          type="button"
          onClick={() => {
            void load().catch(() => {
              setLoadFailed(true);
              setFeedback("error");
            });
          }}
        >
          {t("retry")}
        </Button>
      </div>
    );
  }

  if (!data) {
    return <p className="mt-6 text-sm text-opseu-gray-dark">{t("loading")}</p>;
  }

  const seatCapHint =
    form.commercialClass === "paid" && form.seatSku
      ? HOSTED_SEAT_SKU_CAPS[
          form.seatSku as keyof typeof HOSTED_SEAT_SKU_CAPS
        ]
      : null;

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-lg border border-opseu-gray/30 bg-white p-4">
        <h2 className="text-sm font-semibold text-opseu-dark">
          {t("hostFlagTitle")}
        </h2>
        <p className="mt-1 text-sm text-opseu-gray-dark">
          {data.enforcementEnabled
            ? t("hostFlagOn", { key: data.envKey })
            : t("hostFlagOff", { key: data.envKey })}
        </p>
        <pre className="mt-3 overflow-x-auto rounded bg-opseu-dark/5 p-3 text-xs text-opseu-dark whitespace-pre-wrap">
          {caproverBlock}
        </pre>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <CapRoverConfigCopyButton text={caproverBlock} />
          <Link
            href="/app/site-admin/host"
            className="text-sm font-medium text-opseu-blue underline underline-offset-2"
          >
            {t("openHostReadiness")}
          </Link>
        </div>
        {!data.durable ? (
          <Callout tone="warning" className="mt-3" role="status">
            <p>{t("needDurable")}</p>
            <p className="mt-1">{t("needDurableNext")}</p>
          </Callout>
        ) : null}
      </section>

      <section className="space-y-3 rounded-lg border border-opseu-gray/30 bg-white p-4">
        <h2 className="text-sm font-semibold text-opseu-dark">
          {t("assignTitle")}
        </h2>
        <p className="text-sm text-opseu-gray-dark">{t("assignIntro")}</p>

        {data.durable && data.unions.length === 0 ? (
          <Callout tone="warning" role="status">
            <p>{t("noUnions")}</p>
            <p className="mt-1">
              <Link
                href="/app/site-admin/organization"
                className="font-medium text-opseu-blue underline underline-offset-2"
              >
                {t("noUnionsNext")}
              </Link>
            </p>
          </Callout>
        ) : (
          <>
            <label className="block text-sm">
              <span className="font-medium text-opseu-dark">
                {t("unionLabel")}
              </span>
              <select
                className="mt-1 w-full rounded border border-opseu-gray/40 px-2 py-2 text-sm"
                value={unionId}
                onChange={(e) => {
                  const next = e.target.value;
                  setUnionId(next);
                  setLocalId("");
                  applySelection(data, next, "");
                }}
              >
                {data.unions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-opseu-dark">
                {t("localLabel")}
              </span>
              <select
                className="mt-1 w-full rounded border border-opseu-gray/40 px-2 py-2 text-sm"
                value={localId}
                onChange={(e) => {
                  const next = e.target.value;
                  setLocalId(next);
                  applySelection(data, unionId, next);
                }}
              >
                <option value="">{t("localInherit")}</option>
                {localsForUnion.map((row) => (
                  <option key={row.id} value={row.id}>
                    {t("localOption", { number: row.localNumber })}
                  </option>
                ))}
              </select>
            </label>

            <Callout tone="muted" role="status" className="text-sm">
              <p className="font-medium text-opseu-dark">
                {t("effectiveTitle")}
              </p>
              <p className="mt-1 text-opseu-gray-dark">
                {t("effectiveAccess", {
                  access:
                    effectivePlan.accessClass === "free"
                      ? t("accessFree")
                      : effectivePlan.accessClass === "full"
                        ? t("accessFull")
                        : t("accessUnset"),
                  commercial:
                    effectivePlan.commercialClass === "member"
                      ? t("commercialMember")
                      : effectivePlan.commercialClass === "paid"
                        ? t("commercialPaid")
                        : t("commercialUnset"),
                })}
              </p>
              {localId ? (
                <p className="mt-1 text-opseu-gray-dark">
                  {t("effectiveInheritHint")}
                </p>
              ) : (
                <p className="mt-1 text-opseu-gray-dark">
                  {t("effectiveUnionHint")}
                </p>
              )}
              {seatCapHint != null ? (
                <p className="mt-1 text-opseu-gray-dark">
                  {t("seatCapSoft", { cap: seatCapHint })}
                </p>
              ) : form.seatSku === "custom" ? (
                <p className="mt-1 text-opseu-gray-dark">{t("seatCapCustom")}</p>
              ) : null}
            </Callout>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-opseu-dark">
                  {t("accessLabel")}
                </span>
                <select
                  className="mt-1 w-full rounded border border-opseu-gray/40 px-2 py-2 text-sm"
                  value={form.accessClass}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accessClass: e.target.value,
                    }))
                  }
                >
                  <option value="unset">{t("accessUnset")}</option>
                  <option value="free">{t("accessFree")}</option>
                  <option value="full">{t("accessFull")}</option>
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-opseu-dark">
                  {t("commercialLabel")}
                </span>
                <select
                  className="mt-1 w-full rounded border border-opseu-gray/40 px-2 py-2 text-sm"
                  value={form.commercialClass}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      commercialClass: e.target.value,
                    }))
                  }
                >
                  <option value="unset">{t("commercialUnset")}</option>
                  <option value="member">{t("commercialMember")}</option>
                  <option value="paid">{t("commercialPaid")}</option>
                </select>
              </label>
            </div>

            <label className="block text-sm">
              <span className="font-medium text-opseu-dark">{t("skuLabel")}</span>
              <select
                className="mt-1 w-full rounded border border-opseu-gray/40 px-2 py-2 text-sm"
                value={form.seatSku}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, seatSku: e.target.value }))
                }
                disabled={form.commercialClass !== "paid"}
              >
                <option value="">{t("skuNone")}</option>
                <option value="solo">
                  {t("skuSolo", {
                    amount: (data.seatSkuCents.solo / 100).toFixed(0),
                  })}
                </option>
                <option value="exec_under_50">
                  {t("skuExec", {
                    amount: (data.seatSkuCents.exec_under_50 / 100).toFixed(0),
                  })}
                </option>
                <option value="custom">{t("skuCustom")}</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-opseu-dark">
              <input
                type="checkbox"
                checked={form.donationAcknowledged}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    donationAcknowledged: e.target.checked,
                  }))
                }
              />
              {t("donationLabel")}
            </label>

            <label className="block text-sm">
              <span className="font-medium text-opseu-dark">
                {t("notesLabel")}
              </span>
              <Input
                className="mt-1"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                maxLength={2000}
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || !data.durable || !unionId}
                onClick={() => void save("union")}
              >
                {t("saveUnion")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !data.durable || !localId}
                onClick={() => void save("local")}
              >
                {t("saveLocal")}
              </Button>
            </div>
          </>
        )}

        {feedback === "saved" ? (
          <Callout tone="success" role="status">
            <p>{t("saved")}</p>
            <p className="mt-1">
              {data.enforcementEnabled
                ? t("savedNextOn")
                : t("savedNextOff")}
            </p>
            {!data.enforcementEnabled ? (
              <p className="mt-1">
                <Link
                  href="/app/site-admin/host"
                  className="font-medium text-opseu-blue underline underline-offset-2"
                >
                  {t("openHostReadiness")}
                </Link>
              </p>
            ) : null}
          </Callout>
        ) : null}
        {feedback === "error" ? (
          <Callout tone="danger" role="alert">
            <p>{t("error")}</p>
            <p className="mt-1">{t("errorNext")}</p>
          </Callout>
        ) : null}
      </section>
    </div>
  );
}
