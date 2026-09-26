"use client";

import { useEffect, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";

type HostBrand = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  localNumber: string;
  subText: string;
  divisionId?: string;
  unionPresetId?: string;
};

type EnvFlags = {
  primaryColor: boolean;
  secondaryColor: boolean;
  accentColor: boolean;
  localNumber: boolean;
  subText: boolean;
  unionPresetId: boolean;
};

type PresetOption = { id: string; name: string };

const HEX = /^#[0-9A-Fa-f]{6}$/;

function safeHex(value: string, fallback: string): string {
  return HEX.test(value) ? value.toUpperCase() : fallback;
}

export function HostBrandAdminForm() {
  const t = useTranslations("hub.platformOperator");
  const statusId = useId();
  const [brand, setBrand] = useState<HostBrand | null>(null);
  const [envOverrides, setEnvOverrides] = useState<EnvFlags | null>(null);
  const [presets, setPresets] = useState<PresetOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/site-admin/host-brand");
    if (!res.ok) throw new Error("load");
    const data = (await res.json()) as {
      brand: HostBrand;
      presets: PresetOption[];
      envOverrides: EnvFlags;
    };
    setBrand(data.brand);
    setPresets(data.presets);
    setEnvOverrides(data.envOverrides);
  };

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/site-admin/host-brand")
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as {
          brand: HostBrand;
          presets: PresetOption[];
          envOverrides: EnvFlags;
        };
        if (cancelled) return;
        setBrand(data.brand);
        setPresets(data.presets);
        setEnvOverrides(data.envOverrides);
      })
      .catch(() => {
        if (!cancelled) setError(t("hostBrandLoadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const coloursValid =
    brand &&
    HEX.test(brand.primaryColor.trim()) &&
    HEX.test(brand.secondaryColor.trim()) &&
    HEX.test(brand.accentColor.trim());

  const save = async () => {
    if (!brand) return;
    if (!coloursValid) {
      setError(t("brandStylesInvalidHex"));
      setSuccess(null);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/site-admin/host-brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryColor: brand.primaryColor.trim().toUpperCase(),
          secondaryColor: brand.secondaryColor.trim().toUpperCase(),
          accentColor: brand.accentColor.trim().toUpperCase(),
          localNumber: brand.localNumber,
          subText: brand.subText,
          ...(brand.divisionId ? { divisionId: brand.divisionId } : {}),
          unionPresetId: brand.unionPresetId?.trim()
            ? brand.unionPresetId.trim()
            : null,
        }),
      });
      const data = (await res.json()) as { error?: string; brand?: HostBrand };
      if (!res.ok) throw new Error(data.error ?? "save");
      if (data.brand) setBrand(data.brand);
      setSuccess(t("hostBrandSaved"));
      await load();
    } catch (err) {
      setError(
        err instanceof Error && err.message !== "save"
          ? err.message
          : t("hostBrandSaveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    if (!window.confirm(t("hostBrandClearConfirm"))) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/site-admin/host-brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      const data = (await res.json()) as { error?: string; brand?: HostBrand };
      if (!res.ok) throw new Error(data.error ?? "clear");
      if (data.brand) setBrand(data.brand);
      setSuccess(t("hostBrandCleared"));
      await load();
    } catch {
      setError(t("hostBrandSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <p className="mt-4 text-sm text-opseu-gray-dark" aria-live="polite">
        {t("hostBrandLoading")}
      </p>
    );
  }

  if (!brand) {
    return (
      <section className="mt-10">
        <Callout tone="danger">
          <p>{error ?? t("hostBrandLoadFailed")}</p>
          <p className="mt-1 text-sm">{t("hostBrandErrorRemedy")}</p>
        </Callout>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-md border border-opseu-gray/15 bg-white p-4">
      <h2 className="text-lg font-semibold text-opseu-dark">
        {t("hostBrandTitle")}
      </h2>
      <p className="mt-1 text-sm text-opseu-gray-dark">{t("hostBrandBody")}</p>

      <div
        className="mt-3 overflow-hidden rounded border border-opseu-gray/15"
        aria-hidden
      >
        <div
          className="flex h-8"
          style={{
            background: `linear-gradient(90deg, ${safeHex(brand.primaryColor, "#C2410C")} 0 34%, ${safeHex(brand.secondaryColor, "#FFFFFF")} 34% 67%, ${safeHex(brand.accentColor, "#9A3412")} 67% 100%)`,
          }}
        />
      </div>

      <div id={statusId} className="mt-3 space-y-3" aria-live="polite">
        {error ? (
          <Callout tone="danger">
            <p>{error}</p>
            <p className="mt-1 text-sm">{t("hostBrandErrorRemedy")}</p>
          </Callout>
        ) : null}
        {success ? (
          <Callout tone="success">
            <p>{success}</p>
          </Callout>
        ) : null}

        {envOverrides && Object.values(envOverrides).some(Boolean) ? (
          <Callout tone="brand">
            <p>{t("hostBrandEnvNote")}</p>
          </Callout>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ["primaryColor", "brandStylesColorPrimary", envOverrides?.primaryColor],
            [
              "secondaryColor",
              "brandStylesColorSecondary",
              envOverrides?.secondaryColor,
            ],
            ["accentColor", "brandStylesColorAccent", envOverrides?.accentColor],
          ] as const
        ).map(([key, labelKey, locked]) => {
          const invalid = !HEX.test(brand[key].trim());
          return (
            <div key={key}>
              <label
                className="block text-xs font-medium text-opseu-gray-dark"
                htmlFor={`host-${key}`}
              >
                {t(labelKey)}
                {locked ? ` (${t("hostBrandEnvLocked")})` : ""}
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  id={`host-${key}`}
                  disabled={locked}
                  className="h-9 w-12 rounded border border-opseu-gray/25 bg-white disabled:opacity-50"
                  value={safeHex(brand[key], "#C2410C")}
                  onChange={(e) =>
                    setBrand({ ...brand, [key]: e.target.value.toUpperCase() })
                  }
                />
                <input
                  disabled={locked}
                  className={`w-full rounded border px-2 py-1.5 font-mono text-sm disabled:opacity-50 ${
                    invalid ? "border-red-500" : "border-opseu-gray/25"
                  }`}
                  value={brand[key]}
                  spellCheck={false}
                  aria-invalid={invalid}
                  onChange={(e) =>
                    setBrand({ ...brand, [key]: e.target.value })
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label
            className="block text-xs font-medium text-opseu-gray-dark"
            htmlFor="host-local"
          >
            {t("hostBrandLocalNumber")}
            {envOverrides?.localNumber
              ? ` (${t("hostBrandEnvLocked")})`
              : ""}
          </label>
          <input
            id="host-local"
            disabled={envOverrides?.localNumber}
            className="mt-1 w-full rounded border border-opseu-gray/25 px-2 py-1.5 disabled:opacity-50"
            value={brand.localNumber}
            onChange={(e) =>
              setBrand({ ...brand, localNumber: e.target.value })
            }
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium text-opseu-gray-dark"
            htmlFor="host-sub"
          >
            {t("hostBrandSubText")}
            {envOverrides?.subText ? ` (${t("hostBrandEnvLocked")})` : ""}
          </label>
          <input
            id="host-sub"
            disabled={envOverrides?.subText}
            className="mt-1 w-full rounded border border-opseu-gray/25 px-2 py-1.5 disabled:opacity-50"
            value={brand.subText}
            onChange={(e) => setBrand({ ...brand, subText: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label
            className="block text-xs font-medium text-opseu-gray-dark"
            htmlFor="host-preset"
          >
            {t("hostBrandPreset")}
            {envOverrides?.unionPresetId
              ? ` (${t("hostBrandEnvLocked")})`
              : ""}
          </label>
          <select
            id="host-preset"
            disabled={envOverrides?.unionPresetId}
            className="mt-1 w-full rounded border border-opseu-gray/25 px-2 py-1.5 disabled:opacity-50"
            value={brand.unionPresetId ?? ""}
            onChange={(e) =>
              setBrand({
                ...brand,
                unionPresetId: e.target.value || undefined,
              })
            }
          >
            <option value="">{t("brandStylesPresetNone")}</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={saving || !coloursValid}
          onClick={() => void save()}
        >
          {saving ? t("brandStylesSaving") : t("hostBrandSave")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={saving}
          onClick={() => void clear()}
        >
          {t("hostBrandClear")}
        </Button>
      </div>
    </section>
  );
}
