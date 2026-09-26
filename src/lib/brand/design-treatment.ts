import type { BrandKit, DesignTreatment } from "@/types/entities";

export const DESIGN_TREATMENTS = ["full", "balanced", "paper"] as const;

export function isDesignTreatment(value: unknown): value is DesignTreatment {
  return value === "full" || value === "balanced" || value === "paper";
}

export function resolveDesignTreatment(
  kit: Pick<BrandKit, "designTreatment">,
  override?: DesignTreatment,
): DesignTreatment {
  return override ?? kit.designTreatment ?? "full";
}
