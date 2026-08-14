/** Print paper sizes for Flyer Maker (preview aspect + PDF inches). */

export type FlyerFormatId = "letter" | "halfLetter" | "tabloid";

export const FLYER_FORMAT_ORDER: readonly FlyerFormatId[] = [
  "letter",
  "halfLetter",
  "tabloid",
] as const;

export const DEFAULT_FLYER_FORMAT: FlyerFormatId = "letter";

export interface FlyerFormat {
  id: FlyerFormatId;
  /** Tailwind aspect utility class for the preview canvas */
  aspectClass: string;
  widthInches: number;
  heightInches: number;
}

export const FLYER_FORMATS: Record<FlyerFormatId, FlyerFormat> = {
  letter: {
    id: "letter",
    aspectClass: "aspect-[8.5/11]",
    widthInches: 8.5,
    heightInches: 11,
  },
  halfLetter: {
    id: "halfLetter",
    aspectClass: "aspect-[5.5/8.5]",
    widthInches: 5.5,
    heightInches: 8.5,
  },
  tabloid: {
    id: "tabloid",
    aspectClass: "aspect-[11/17]",
    widthInches: 11,
    heightInches: 17,
  },
};

export function isFlyerFormatId(value: unknown): value is FlyerFormatId {
  return (
    value === "letter" || value === "halfLetter" || value === "tabloid"
  );
}
