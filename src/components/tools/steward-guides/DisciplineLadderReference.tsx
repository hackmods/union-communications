"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ProgressiveDisciplineLadderDiagram } from "@/components/comms/StewardGuideDiagrams";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Link } from "@/i18n/navigation";
import {
  DISCIPLINE_LADDER_PRESET_IDS,
  DISCIPLINE_LADDER_RUNG_MAX,
  DISCIPLINE_LADDER_RUNG_MIN,
  activeBrandKitProfile,
  isDisciplineLadderPresetId,
  patchActiveProfileLadder,
  presetRungsAsCustom,
  resolveDisciplineLadder,
  resolveLadderPresetId,
  type DisciplineLadderPresetId,
} from "@/lib/steward-guides/discipline-ladder-presets";
import { useBrandStore } from "@/store/brand-store";

export function DisciplineLadderReference() {
  const t = useTranslations("preDisciplinaryLog");
  const brandKit = useBrandStore((s) => s.brandKit);
  const setBrandKit = useBrandStore((s) => s.setBrandKit);
  const [editing, setEditing] = useState(false);

  const labelForKey = (labelKey: string) => t(`ladder.rungs.${labelKey}`);
  const resolved = resolveDisciplineLadder(brandKit, labelForKey);
  const profile = activeBrandKitProfile(brandKit);
  const presetId = resolveLadderPresetId(brandKit);
  const collectionLabel = profile?.label?.trim() || t("ladder.defaultCollection");

  const applyLadderPatch = (
    patch: Parameters<typeof patchActiveProfileLadder>[1],
  ) => {
    const next = patchActiveProfileLadder(brandKit, patch);
    setBrandKit({
      profiles: next.profiles,
      activeProfileId: next.activeProfileId,
    });
  };

  const setPreset = (next: DisciplineLadderPresetId) => {
    applyLadderPatch({
      ladderPresetId: next,
      disciplineLadderCustom: null,
    });
    setEditing(false);
  };

  const startEdit = () => {
    if (!resolved.isCustom) {
      applyLadderPatch({
        ladderPresetId: presetId,
        disciplineLadderCustom: presetRungsAsCustom(presetId, labelForKey),
      });
    }
    setEditing(true);
  };

  const custom = profile?.disciplineLadderCustom;
  const editRungs = custom?.rungs ?? resolved.rungs;

  const updateRungLabel = (index: number, label: string) => {
    if (!custom) return;
    const rungs = editRungs.map((rung, i) =>
      i === index ? { ...rung, label } : rung,
    );
    applyLadderPatch({
      ladderPresetId: presetId,
      disciplineLadderCustom: {
        sourcePresetId: custom.sourcePresetId,
        rungs,
      },
    });
  };

  const addRung = () => {
    if (!custom || editRungs.length >= DISCIPLINE_LADDER_RUNG_MAX) return;
    applyLadderPatch({
      ladderPresetId: presetId,
      disciplineLadderCustom: {
        sourcePresetId: custom.sourcePresetId,
        rungs: [
          ...editRungs,
          {
            id: `custom-${editRungs.length + 1}`,
            label: t("ladder.newRung"),
          },
        ],
      },
    });
  };

  const removeRung = (index: number) => {
    if (!custom || editRungs.length <= DISCIPLINE_LADDER_RUNG_MIN) return;
    applyLadderPatch({
      ladderPresetId: presetId,
      disciplineLadderCustom: {
        sourcePresetId: custom.sourcePresetId,
        rungs: editRungs.filter((_, i) => i !== index),
      },
    });
  };

  const moveRung = (index: number, dir: -1 | 1) => {
    if (!custom) return;
    const next = index + dir;
    if (next < 0 || next >= editRungs.length) return;
    const rungs = [...editRungs];
    const [item] = rungs.splice(index, 1);
    rungs.splice(next, 0, item);
    applyLadderPatch({
      ladderPresetId: presetId,
      disciplineLadderCustom: {
        sourcePresetId: custom.sourcePresetId,
        rungs,
      },
    });
  };

  const resetToPreset = () => {
    applyLadderPatch({
      ladderPresetId: presetId,
      disciplineLadderCustom: null,
    });
    setEditing(false);
  };

  const diagramSteps = resolved.rungs.map((r) => r.label);

  return (
    <details className="rounded-lg border border-gray-200 bg-slate-50/80 p-3 open:bg-white">
      <summary className="cursor-pointer text-sm font-semibold text-opseu-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opseu-blue/50">
        {t("ladder.referenceSummary")}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-sm font-semibold text-opseu-dark">{t("ladder.title")}</p>
        <p className="text-xs text-gray-600">{t("ladder.hint")}</p>
        <p className="text-xs text-gray-700">
          {t("ladder.using", {
            collection: collectionLabel,
            preset: t(`ladder.presets.${resolved.presetId}`),
          })}
          {resolved.isCustom ? ` ${t("ladder.customSuffix")}` : ""}
        </p>
        <p className="text-xs text-gray-600">{t("ladder.disclaimer")}</p>

        <Select
          label={t("ladder.presetLabel")}
          value={presetId}
          onChange={(e) => {
            const value = e.target.value;
            if (isDisciplineLadderPresetId(value)) setPreset(value);
          }}
        >
          {DISCIPLINE_LADDER_PRESET_IDS.map((id) => (
            <option key={id} value={id}>
              {t(`ladder.presets.${id}`)}
            </option>
          ))}
        </Select>

        <ProgressiveDisciplineLadderDiagram steps={diagramSteps} />

        {!editing ? (
          <Button type="button" size="sm" variant="secondary" onClick={startEdit}>
            {t("ladder.editForCollection")}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-sm font-medium text-slate-900">
              {t("ladder.editHeading")}
            </p>
            <ul className="space-y-2">
              {editRungs.map((rung, index) => (
                <li
                  key={rung.id}
                  className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 p-2"
                >
                  <div className="min-w-40 flex-1">
                    <Input
                      label={t("ladder.rungLabel", { n: index + 1 })}
                      value={rung.label}
                      maxLength={80}
                      onChange={(e) => updateRungLabel(index, e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => moveRung(index, -1)}
                    >
                      {t("ladder.moveUp")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === editRungs.length - 1}
                      onClick={() => moveRung(index, 1)}
                    >
                      {t("ladder.moveDown")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={editRungs.length <= DISCIPLINE_LADDER_RUNG_MIN}
                      onClick={() => removeRung(index)}
                    >
                      {t("ladder.removeRung")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={editRungs.length >= DISCIPLINE_LADDER_RUNG_MAX}
                onClick={addRung}
              >
                {t("ladder.addRung")}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={resetToPreset}>
                {t("ladder.resetPreset")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                {t("ladder.doneEditing")}
              </Button>
            </div>
          </div>
        )}

        <p className="text-sm leading-relaxed">
          <Link
            href="/learn/officer/progressive-discipline"
            className="font-semibold text-opseu-blue underline underline-offset-2"
          >
            {t("ladder.moduleLink")}
          </Link>
          <span className="text-xs text-gray-600"> — {t("ladder.moduleNote")}</span>
        </p>
      </div>
    </details>
  );
}
