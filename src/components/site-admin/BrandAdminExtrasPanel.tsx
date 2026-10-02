"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Input } from "@/components/ui/Input";

type Binding = {
  id: string;
  presetId: string;
  sectorId: string;
  unionId: string;
  scopeId: string;
};

type MergedPreset = { id: string; name: string; source: string };
type UnionOption = { id: string; name: string };

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Compact Site Admin panels for sector bindings + durable Comms presets.
 * Mounted under Brand Styles — reuses union/preset lists from brand-styles API.
 */
export function BrandAdminExtrasPanel() {
  const t = useTranslations("hub.platformOperator.brandAdminExtras");
  const titleId = useId();
  const unionFieldId = useId();
  const bindingPresetId = useId();
  const sectorFieldId = useId();
  const catalogPresetId = useId();
  const catalogNameId = useId();
  const primaryHexId = useId();
  const primaryPickerId = useId();

  const [unions, setUnions] = useState<UnionOption[]>([]);
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [merged, setMerged] = useState<MergedPreset[]>([]);
  const [unionId, setUnionId] = useState("");
  const [presetId, setPresetId] = useState("");
  const [sectorId, setSectorId] = useState("");
  const [newPresetId, setNewPresetId] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#C2410C");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const bindingUrl = unionId.trim()
        ? `/api/site-admin/preset-bindings?unionId=${encodeURIComponent(unionId.trim())}`
        : "/api/site-admin/preset-bindings";
      const [stylesRes, bRes, pRes] = await Promise.all([
        fetch("/api/site-admin/brand-styles"),
        fetch(bindingUrl),
        fetch("/api/site-admin/comms-presets"),
      ]);
      if (!stylesRes.ok || !bRes.ok || !pRes.ok) {
        setError(t("loadError"));
        return;
      }
      const stylesJson = (await stylesRes.json()) as {
        unions: UnionOption[];
        presets: Array<{ id: string; name: string }>;
      };
      const bJson = (await bRes.json()) as { bindings: Binding[] };
      const pJson = (await pRes.json()) as { merged: MergedPreset[] };
      setUnions(stylesJson.unions ?? []);
      setBindings(bJson.bindings);
      const mergedList =
        pJson.merged.length > 0
          ? pJson.merged
          : (stylesJson.presets ?? []).map((p) => ({
              ...p,
              source: "compiled" as const,
            }));
      setMerged(mergedList);
      setUnionId((current) => {
        if (current) return current;
        return stylesJson.unions[0]?.id ?? "";
      });
      setPresetId((current) => {
        if (current) return current;
        return mergedList[0]?.id ?? stylesJson.presets[0]?.id ?? "";
      });
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t, unionId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function saveBinding() {
    setOk(null);
    setError(null);
    const targetUnion = unionId.trim();
    if (!targetUnion) {
      setError(t("unionRequired"));
      return;
    }
    if (!presetId.trim()) {
      setError(t("presetRequired"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/site-admin/preset-bindings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: presetId.trim(),
          sectorId: sectorId.trim(),
          unionId: targetUnion,
          scopeId: targetUnion,
        }),
      });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      setOk(t("bindingSaved"));
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function removeBinding(row: Binding) {
    setOk(null);
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/site-admin/preset-bindings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          presetId: row.presetId,
          sectorId: row.sectorId,
        }),
      });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      setOk(t("bindingRemoved"));
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function savePreset() {
    setOk(null);
    setError(null);
    if (!newPresetId.trim() || !newPresetName.trim()) {
      setError(t("presetFieldsRequired"));
      return;
    }
    if (!HEX.test(primaryColor.trim())) {
      setError(t("invalidHex"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/site-admin/comms-presets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newPresetId.trim(),
          name: newPresetName.trim(),
          primaryColor: primaryColor.trim().toUpperCase(),
          secondaryColor: "#FFFFFF",
          accentColor: "#9A3412",
          defaultSlogans: [newPresetName.trim()],
        }),
      });
      if (!res.ok) {
        setError(t("saveError"));
        return;
      }
      setOk(t("presetSaved"));
      setNewPresetId("");
      setNewPresetName("");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  const safePrimary = HEX.test(primaryColor) ? primaryColor : "#C2410C";

  if (loading) {
    return (
      <section className="mt-8 border-t border-gray-200 pt-6" aria-busy="true">
        <p className="text-sm text-gray-600">{t("loading")}</p>
      </section>
    );
  }

  return (
    <section
      className="mt-8 space-y-4 border-t border-gray-200 pt-6"
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className="text-lg font-semibold text-gray-900">
        {t("title")}
      </h2>
      <p className="text-sm text-gray-600">{t("body")}</p>
      {error ? <Callout tone="warning">{error}</Callout> : null}
      {ok ? <Callout tone="success">{ok}</Callout> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900">{t("bindingsTitle")}</h3>
          <label className="block text-sm" htmlFor={unionFieldId}>
            <span className="text-gray-700">{t("unionId")}</span>
            <select
              id={unionFieldId}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={unionId}
              onChange={(e) => setUnionId(e.target.value)}
              disabled={busy || unions.length === 0}
            >
              {unions.length === 0 ? (
                <option value="">{t("noUnions")}</option>
              ) : (
                unions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block text-sm" htmlFor={bindingPresetId}>
            <span className="text-gray-700">{t("presetId")}</span>
            <select
              id={bindingPresetId}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              disabled={busy || merged.length === 0}
            >
              {merged.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm" htmlFor={sectorFieldId}>
            <span className="text-gray-700">{t("sectorId")}</span>
            <Input
              id={sectorFieldId}
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              placeholder="caat-support"
              disabled={busy}
            />
          </label>
          <Button
            type="button"
            onClick={() => void saveBinding()}
            disabled={busy || !unionId || !presetId}
          >
            {busy ? t("saving") : t("saveBinding")}
          </Button>
          <ul className="space-y-2 text-sm text-gray-600">
            {bindings.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {b.presetId}
                  {b.sectorId ? ` / ${b.sectorId}` : ""} → {b.unionId}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void removeBinding(b)}
                >
                  {t("removeBinding")}
                </Button>
              </li>
            ))}
            {bindings.length === 0 ? <li>{t("noBindings")}</li> : null}
          </ul>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900">{t("catalogTitle")}</h3>
          <label className="block text-sm" htmlFor={catalogPresetId}>
            <span className="text-gray-700">{t("presetId")}</span>
            <Input
              id={catalogPresetId}
              value={newPresetId}
              onChange={(e) => setNewPresetId(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block text-sm" htmlFor={catalogNameId}>
            <span className="text-gray-700">{t("presetName")}</span>
            <Input
              id={catalogNameId}
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              disabled={busy}
            />
          </label>
          <div className="space-y-1">
            <p id={primaryHexId} className="text-sm text-gray-700">
              {t("primaryColor")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={primaryPickerId}
                type="color"
                value={safePrimary}
                aria-labelledby={primaryHexId}
                className="h-10 w-12 cursor-pointer rounded border border-gray-300 bg-white"
                onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                disabled={busy}
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                aria-labelledby={primaryHexId}
                className="max-w-[8rem]"
                disabled={busy}
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void savePreset()}
            disabled={busy}
          >
            {busy ? t("saving") : t("savePreset")}
          </Button>
          <p className="text-xs text-gray-500">
            {t("mergedCount", { count: merged.length })}
          </p>
        </div>
      </div>
    </section>
  );
}
