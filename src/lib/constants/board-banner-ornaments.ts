/** Shared ornament options for Board Banner & Trim (banner + all trim pieces). */

export type BoardLogoMode = "none" | "lockup" | "mark";

export interface BoardOrnaments {
  showLocal: boolean;
  logoMode: BoardLogoMode;
  showByline: boolean;
  byline: string;
}

export const DEFAULT_ORNAMENTS: BoardOrnaments = {
  showLocal: true,
  logoMode: "none",
  showByline: false,
  byline: "",
};

/** Corner byline only when the tile is wide enough to read. */
export function cornerAllowsByline(
  showByline: boolean,
  edgeWidthInches: number,
): boolean {
  return showByline && edgeWidthInches >= 2;
}
