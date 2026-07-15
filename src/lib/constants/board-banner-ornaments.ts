/** Shared ornament options for Board Banner & Trim (banner + all trim pieces). */

export type BoardLogoMode = "none" | "lockup" | "mark";

export interface BoardOrnaments {
  showChevrons: boolean;
  showLocal: boolean;
  logoMode: BoardLogoMode;
  showByline: boolean;
  byline: string;
}

export const DEFAULT_ORNAMENTS: BoardOrnaments = {
  showChevrons: true,
  showLocal: true,
  logoMode: "none",
  showByline: false,
  byline: "",
};

/** Chevrons are never drawn on vertical side rails. */
export function pieceUsesChevrons(
  piece: "banner" | "side" | "bottom" | "corner",
  showChevrons: boolean,
): boolean {
  if (piece === "side") return false;
  return showChevrons;
}

/** Corner byline only when the tile is wide enough to read. */
export function cornerAllowsByline(
  showByline: boolean,
  edgeWidthInches: number,
): boolean {
  return showByline && edgeWidthInches >= 2;
}
