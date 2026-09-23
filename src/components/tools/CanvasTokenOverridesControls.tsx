"use client";

import { useTranslations } from "next-intl";
import { SegControl } from "@/components/tools/SegControl";
import { ToolFormDetails } from "@/components/tools/ToolFormDetails";
import type {
  CanvasAlignmentBias,
  CanvasDensity,
  CanvasQrPlate,
  CanvasSurface,
  CanvasTypeScale,
} from "@/types/entities";
import type { CanvasTokenOverrides } from "@/lib/comms/canvas-token-overrides";
import {
  EMPTY_CANVAS_TOKEN_OVERRIDES,
  hasCanvasTokenOverrides,
} from "@/lib/comms/canvas-token-overrides";
import { Button } from "@/components/ui/Button";

const TYPE_SCALE_SIZE_HINT: Record<CanvasTypeScale, string> = {
  display: "36 / 17",
  compact: "28 / 16",
  dense: "24 / 14",
};

/**
 * Ephemeral Advanced Brand Token controls for graphic / print tools.
 * Overrides apply to the current layout only — Brand Kit stays unchanged.
 */
export function CanvasTokenOverridesControls({
  brandDefaults,
  overrides,
  onChange,
}: {
  brandDefaults: {
    typeScale: CanvasTypeScale;
    density: CanvasDensity;
    alignmentBias: CanvasAlignmentBias;
    qrPlate: CanvasQrPlate;
    surface: CanvasSurface;
  };
  overrides: CanvasTokenOverrides;
  onChange: (next: CanvasTokenOverrides) => void;
}) {
  const t = useTranslations("brandKit.toolOverrides");
  const tc = useTranslations("brandKit.canvas");
  const active = hasCanvasTokenOverrides(overrides);

  const setToken = <K extends keyof CanvasTokenOverrides>(
    key: K,
    value: CanvasTokenOverrides[K] | "inherit",
  ) => {
    if (value === "inherit") {
      const next = { ...overrides };
      delete next[key];
      onChange(next);
      return;
    }
    onChange({ ...overrides, [key]: value });
  };

  const typeScale = overrides.typeScale ?? brandDefaults.typeScale;
  const density = overrides.density ?? brandDefaults.density;
  const alignmentBias = overrides.alignmentBias ?? brandDefaults.alignmentBias;

  return (
    <ToolFormDetails title={t("title")} defaultOpen={active}>
      <p className="text-xs leading-snug text-gray-600">{t("description")}</p>
      <SegControl
        label={t("typeScale")}
        value={overrides.typeScale ?? "inherit"}
        options={[
          { value: "inherit", label: t("inherit", { hint: TYPE_SCALE_SIZE_HINT[brandDefaults.typeScale] }) },
          ...(
            ["display", "compact", "dense"] as const
          ).map((v) => ({
            value: v,
            label: `${tc(`typeScaleOpts.${v}`)} (${TYPE_SCALE_SIZE_HINT[v]})`,
          })),
        ]}
        onChange={(v) =>
          setToken("typeScale", v as CanvasTypeScale | "inherit")
        }
      />
      <SegControl
        label={tc("density")}
        value={overrides.density ?? "inherit"}
        options={[
          { value: "inherit", label: t("inheritBrand") },
          { value: "roomy", label: tc("densityOpts.roomy") },
          { value: "tight", label: tc("densityOpts.tight") },
        ]}
        onChange={(v) =>
          setToken("density", v as CanvasDensity | "inherit")
        }
      />
      <SegControl
        label={tc("alignment")}
        value={overrides.alignmentBias ?? "inherit"}
        options={[
          { value: "inherit", label: t("inheritBrand") },
          {
            value: "center",
            label: tc("alignmentBias.center"),
          },
          { value: "start", label: tc("alignmentBias.start") },
          {
            value: "asymmetric",
            label: tc("alignmentBias.asymmetric"),
          },
        ]}
        onChange={(v) =>
          setToken("alignmentBias", v as CanvasAlignmentBias | "inherit")
        }
      />
      <p className="text-xs text-gray-500">
        {t("activeSummary", {
          type: tc(`typeScaleOpts.${typeScale}`),
          density: tc(`densityOpts.${density}`),
          align: tc(`alignmentBias.${alignmentBias}`),
        })}
      </p>
      {active ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ ...EMPTY_CANVAS_TOKEN_OVERRIDES })}
        >
          {t("reset")}
        </Button>
      ) : null}
    </ToolFormDetails>
  );
}
