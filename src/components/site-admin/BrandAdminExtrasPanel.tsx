"use client";

import { useCallback, useEffect, useState } from "react";
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

/**
 * Compact Site Admin panels for sector bindings + durable Comms presets.
 * Mounted under Brand Styles.
 */
export function BrandAdminExtrasPanel() {
  const t = useTranslations("hub.platformOperator.brandAdminExtras");
  const [unionId, setUnionId] = useState("");
  const [bindings, setBindings] = useState<Binding[]>([]);
  const [merged, setMerged] = useState<MergedPreset[]>([]);
  const [presetId, setPresetId] = useState("opseu");
  const [sectorId, setSectorId] = useState("");
  const [newPresetId, setNewPresetId] = useState("");
  const [newPresetName, setNewPresetName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#C2410C");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const bindingUrl = unionId.trim()
        ? `/api/site-admin/preset-bindings?unionId=${encodeURIComponent(unionId.trim())}`
        : "/api/site-admin/preset-bindings";
      const [bRes, pRes] = await Promise.all([
        fetch(bindingUrl),
        fetch("/api/site-admin/comms-presets"),
      ]);
      if (!bRes.ok || !pRes.ok) {
        setError(t("loadError"));
        return;
      }
      const bJson = (await bRes.json()) as { bindings: Binding[] };
      const pJson = (await pRes.json()) as { merged: MergedPreset[] };
      setBindings(bJson.bindings);
      setMerged(pJson.merged);
    } catch {
      setError(t("loadError"));
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
    const res = await fetch("/api/site-admin/preset-bindings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        presetId,
        sectorId,
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
  }

  async function savePreset() {
    setOk(null);
    setError(null);
    const res = await fetch("/api/site-admin/comms-presets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newPresetId,
        name: newPresetName,
        primaryColor,
        secondaryColor: "#FFFFFF",
        accentColor: "#9A3412",
        defaultSlogans: [newPresetName],
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
  }

  return (
    <section className="mt-8 space-y-4 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold text-gray-900">{t("title")}</h2>
      <p className="text-sm text-gray-600">{t("body")}</p>
      {error ? <Callout tone="warning">{error}</Callout> : null}
      {ok ? <Callout tone="success">{ok}</Callout> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900">{t("bindingsTitle")}</h3>
          <label className="block text-sm">
            <span className="text-gray-700">{t("unionId")}</span>
            <Input
              value={unionId}
              onChange={(e) => setUnionId(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">{t("presetId")}</span>
            <Input value={presetId} onChange={(e) => setPresetId(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">{t("sectorId")}</span>
            <Input
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              placeholder="caat-support"
            />
          </label>
          <Button type="button" onClick={() => void saveBinding()}>
            {t("saveBinding")}
          </Button>
          <ul className="text-sm text-gray-600">
            {bindings.map((b) => (
              <li key={b.id}>
                {b.presetId}
                {b.sectorId ? ` / ${b.sectorId}` : ""} → {b.unionId}
              </li>
            ))}
            {bindings.length === 0 ? <li>{t("noBindings")}</li> : null}
          </ul>
        </div>

        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900">{t("catalogTitle")}</h3>
          <label className="block text-sm">
            <span className="text-gray-700">{t("presetId")}</span>
            <Input
              value={newPresetId}
              onChange={(e) => setNewPresetId(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">{t("presetName")}</span>
            <Input
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-gray-700">{t("primaryColor")}</span>
            <Input
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              aria-label={t("primaryColor")}
            />
          </label>
          <Button type="button" onClick={() => void savePreset()}>
            {t("savePreset")}
          </Button>
          <p className="text-xs text-gray-500">
            {t("mergedCount", { count: merged.length })}
          </p>
        </div>
      </div>
    </section>
  );
}
